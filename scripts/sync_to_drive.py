import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

SCOPES = ['https://www.googleapis.com/auth/drive']
FOLDER_ID = (os.environ.get('GDRIVE_FOLDER_ID') or '').strip()
SA_KEY_RAW = (os.environ.get('GDRIVE_SA_KEY') or '').strip()

# Folder B में मौजूद आपकी फ़ाइल की निश्चित File ID
TARGET_FILE_ID = "1Cek2LaS7qICH4MFdB66_Q7w2Isd2fwFA"

def get_drive_service():
    if not SA_KEY_RAW:
        raise ValueError("GDRIVE_SA_KEY environment secret is missing.")
    key_dict = json.loads(SA_KEY_RAW)
    creds = service_account.Credentials.from_service_account_info(
        key_dict, scopes=SCOPES
    )
    return build('drive', 'v3', credentials=creds)

def build_codebase_summary(output_filename="00_LIVE_CODEBASE_SNAPSHOT_RISE_MITRA.md"):
    supported_extensions = ('.json', '.prisma', '.ts', '.js', '.yml', '.yaml', '.md', '.example', '.gitignore')
    ignore_dirs = {'.git', 'node_modules', 'dist', 'build', '.vscode', '.idea'}
    ignore_files = {'.env', 'package-lock.json', output_filename}

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

def update_drive_snapshot(service, filename, file_id):
    media = MediaFileUpload(filename, mimetype='text/markdown', resumable=True)
    updated = service.files().update(
        fileId=file_id,
        media_body=media,
        fields='id, name, modifiedTime'
    ).execute()
    print(f"🚀 SUCCESS: Direct updated file in Google Drive!")
    print(f"File Name: {updated.get('name')} | ID: {updated.get('id')}")

def main():
    service = get_drive_service()
    summary_file = build_codebase_summary()
    update_drive_snapshot(service, summary_file, TARGET_FILE_ID)
    print("✨ Rise Mitra live codebase snapshot synced successfully to Google Drive.")

if __name__ == '__main__':
    main()
