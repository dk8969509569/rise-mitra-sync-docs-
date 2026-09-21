/**
 * @canonical-root File-03 (03_00_LEGAL_SECURITY_PRIVACY_COMPLIANCE_RISE_MITRA)
 * @child-ext      NONE
 * @tier           Tier-2
 * @domain         Domain-03
 * @zero-loss-rule Invariant validated against master specification: Privacy-by-Design
 */

import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";

export interface SanitizedIdentity {
  maskedId: string;
  isMinor: boolean;
  isProtectedDwelling: boolean;
}

export class PrivacyShieldMiddleware {
  /**
   * Masks phone numbers to format: +91-XXXXX-XX123
   */
  public static maskPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.length < 10) return "+91-XXXXX-XXXXX";
    const lastThree = cleaned.slice(-3);
    return `+91-XXXXX-XX${lastThree}`;
  }

  /**
   * Enforces privacy mask for protected sectors (Hostels, Minors)
   */
  public static maskIdentity(userId: string, isProtected: boolean = false): string {
    if (isProtected) {
      const hash = userId.slice(-4).toUpperCase();
      return `USR-PROTECTED-${hash}`;
    }
    return `USR-${userId.slice(-6).toUpperCase()}`;
  }

  /**
   * Fastify Ingress Sanitization Hook
   */
  public static ingressFilter(req: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction): void {
    const body = req.body as Record<string, unknown> | undefined;

    if (body && typeof body === "object") {
      if (typeof body.phone === "string") {
        body.maskedPhone = PrivacyShieldMiddleware.maskPhoneNumber(body.phone);
      }
      if (body.sectorCode === "GIRLS_HOSTEL" || body.isMinor === true) {
        body.restrictedIngress = true;
      }
    }
    done();
  }
}
