import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";

export async function postAuthCommunityMemberPasswordResetRequest(props: {
  body: ICommunityBbsCommunityMember.IRequestPasswordReset;
}): Promise<ICommunityBbsCommunityMember.IResetRequestResponse> {
  const { body } = props;

  try {
    // Generate a high-entropy single-use token
    const rawToken = `${v4()}-${v4()}`;

    // Hash token before persisting
    const hashedToken = await PasswordUtil.hash(rawToken);

    // Expiry set to 1 hour from now; converted to ISO string using helper
    const expiresAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));

    // Attempt to find the member by email (unique index)
    const member =
      await MyGlobal.prisma.community_bbs_communitymember.findUnique({
        where: { email: body.email },
      });

    if (member) {
      // Persist only hashed token and expiry. Use inline data to keep clear type errors
      await MyGlobal.prisma.community_bbs_communitymember.update({
        where: { id: member.id },
        data: {
          password_reset_token_hash: hashedToken,
          password_reset_expires_at: expiresAt,
        },
      });

      // Best-effort: enqueue/send an out-of-band email containing the raw token
      try {
        // Try common mailer shapes on MyGlobal without assuming their existence
        if (typeof (MyGlobal as any).mailer?.sendPasswordReset === "function") {
          await (MyGlobal as any).mailer.sendPasswordReset(
            member.email,
            rawToken,
            expiresAt,
          );
        } else if (
          typeof (MyGlobal as any).emailService?.enqueue === "function"
        ) {
          await (MyGlobal as any).emailService.enqueue("password_reset", {
            to: member.email,
            token: rawToken,
            expires_at: expiresAt,
          });
        } else if (typeof (MyGlobal as any).mailer?.send === "function") {
          await (MyGlobal as any).mailer.send({
            to: member.email,
            subject: "Password reset instructions",
            template: "password_reset",
            context: { token: rawToken, expires_at: expiresAt },
          });
        } else {
          // No mailer available - log non-sensitive info for operators
          if (typeof (MyGlobal as any).logger?.info === "function")
            (MyGlobal as any).logger.info(
              "Password reset requested — mailer not configured.",
            );
        }
      } catch (_e) {
        // Swallow mailing errors to avoid leaking account info
      }
    }

    // Always return an opaque acknowledgement to prevent account enumeration
    return {
      success: true,
      message:
        "If an account exists for the provided email, password reset instructions have been sent.",
    };
  } catch (_err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
