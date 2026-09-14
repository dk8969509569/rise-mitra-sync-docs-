import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

SCOPES = ['https://www.googleapis.com/auth/drive']
FOLDER_ID = (os.environ.get('GDRIVE_FOLDER_ID') or '').strip()
SA_KEY_RAW = (os.environ.get('GDRIVE_SA_KEY') or '').strip()


def get_drive_service():
    if not SA_KEY_RAW:
        raise ValueError("GDRIVE_SA_KEY environment secret is missing.")
    key_dict = json.loads(SA_KEY_RAW)
    creds = service_account.Credentials.from_service_account_info(
        key_dict, scopes=SCOPES
    )
    return build('drive', 'v3', credentials=creds)

def build_codebase_summary(output_filename="00_LIVE_CODEBASE_SNAPSHOT_RISE_MITRA.md"):
    """
    सभी आवश्यक कोड व कॉन्फ़िगरेशन फ़ाइलों को क्रमबद्ध नंबरिंग (1, 2, 3...)
    के साथ एक ही स्ट्रक्चर्ड Markdown फ़ाइल में बंडल करता है।
    """
    supported_extensions = ('.json', '.prisma', '.ts', '.js', '.yml', '.yaml', '.md', '.example', '.gitignore')
    ignore_dirs = {'.git', 'node_modules', 'dist', 'build', '.vscode', '.idea'}
    ignore_files = {'.env', 'package-lock.json', output_filename}

    # प्राथमिक कोर कॉन्फ़िग फ़ाइलों का निश्चित शीर्ष क्रम
    priority_order = [
        "00_RISE_MITRA_18ROOT_CHILD_EXTENSION_4TIER_CODE_COMPILATION_ZEL_SPEC.md",
        "package.json",
        "tsconfig.json",
        "docker-compose.yml",
        ".env.example",
        ".gitignore",
        "README.md",
        "prisma/schema.prisma"
    ]

    with open(output_filename, 'w', encoding='utf-8') as outfile:
        outfile.write("# RISE MITRA — AUTOMATED LIVE CODEBASE SNAPSHOT\n")
        outfile.write("Project: Rise Mitra | Multi-Domain Autonomous Telegram Bot & Trading Super-App\n")
        outfile.write("Architecture: Single-Source Bundled Snapshot for Google Drive & NotebookLM\n")
        outfile.write("Generated automatically via GitHub Actions.\n\n")
        outfile.write("================================================================================\n\n")

        file_counter = 1
        processed_files = set()

        # 1. प्राथमिक कोर फाइलों को क्रमबद्ध बंडल करें
        for p_file in priority_order:
            if os.path.exists(p_file):
                processed_files.add(os.path.abspath(p_file))
                outfile.write(f"## [{file_counter}] File: `{p_file}`\n```text\n")
                try:
                    with open(p_file, 'r', encoding='utf-8', errors='ignore') as infile:
                        outfile.write(infile.read())
                except Exception as e:
                    outfile.write(f"Error reading file: {e}\n")
                outfile.write("\n```\n\n--------------------------------------------------------------------------------\n\n")
                file_counter += 1

        # 2. बाकी सभी कोड फ़ाइलों (src, scripts आदि) को जोड़ें
        for root, dirs, files in os.walk('.'):
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            for file in sorted(files):
                filepath = os.path.join(root, file)
                abs_path = os.path.abspath(filepath)

                if (file.endswith(supported_extensions) and 
                    file not in ignore_files and 
                    abs_path not in processed_files):
                    
                    clean_path = filepath.replace('\\', '/').lstrip('./')
                    outfile.write(f"## [{file_counter}] File: `{clean_path}`\n```text\n")
                    try:
                        with open(filepath, 'r', encoding='utf-8', errors='ignore') as infile:
                            outfile.write(infile.read())
                    except Exception as e:
                        outfile.write(f"Error reading file: {e}\n")
                    outfile.write("\n```\n\n--------------------------------------------------------------------------------\n\n")
                    file_counter += 1

    print(f"✅ Codebase snapshot successfully bundled: {file_counter - 1} files included.")
    return output_filename

def upload_or_update_file(service, filename, folder_id):
    """
    Google Drive में फ़ाइल को ढूँढकर ओवरराइट (Update) करता है, या नई बनाता है।
    """
    query = f"name = '{filename}' and '{folder_id}' in parents and trashed = false"
    results = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
    existing_files = results.get('files', [])

    media = MediaFileUpload(filename, mimetype='text/markdown', resumable=True)

    if existing_files:
        file_id = existing_files[0]['id']
        service.files().update(fileId=file_id, media_body=media).execute()
        print(f"🔄 Updated existing file in Google Drive: {filename} (ID: {file_id})")
    else:
        file_metadata = {'name': filename, 'parents': [folder_id]}
        created = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
        print(f"➕ Created new file in Google Drive: {filename} (ID: {created.get('id')})")

def main():
    service = get_drive_service()
    summary_file = build_codebase_summary()
    upload_or_update_file(service, summary_file, FOLDER_ID)
    print("🚀 All code files synced as 1 single snapshot to Google Drive.")

if __name__ == '__main__':
    main()
