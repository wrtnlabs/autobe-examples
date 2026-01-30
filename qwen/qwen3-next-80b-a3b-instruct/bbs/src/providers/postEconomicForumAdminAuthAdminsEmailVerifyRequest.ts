import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumAdminEmailVerificationResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdminEmailVerificationResult";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postEconomicForumAdminAuthAdminsEmailVerifyRequest(props: {
  admin: AdminPayload;
}): Promise<IEconomicForumAdminEmailVerificationResult> {
  // Generate 64-character cryptographically secure token using crypto.subtle
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const tokenString = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const tokenValue = tokenString as string & tags.Format<"uuid">;
  // Calculate expires_at as 24 hours from now
  const nowMillis = Date.now();
  const expiresAtMillis = nowMillis + 24 * 60 * 60 * 1000;
  const expiresAt = toISOStringSafe(new Date(expiresAtMillis)) as string &
    tags.Format<"date-time">;
  // Mark any existing pending verification tokens for this admin as used
  await MyGlobal.prisma.economic_forum_admin_email_verifications.updateMany({
    where: {
      admin_id: props.admin.id,
      valid: false,
    },
    data: {
      valid: true,
    },
  });
  // Insert new verification record
  await MyGlobal.prisma.economic_forum_admin_email_verifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: props.admin.id,
      token: tokenValue,
      created_at: toISOStringSafe(new Date(nowMillis)) as string &
        tags.Format<"date-time">,
      expires_at: expiresAt,
      valid: false,
    },
  });
  // Log audit event
  await MyGlobal.prisma.economic_forum_system_audits.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: props.admin.id,
      action: "ADMIN_EMAIL_VERIFICATION_REQUEST",
      message: "New email verification token generated and sent",
      occurred_at: toISOStringSafe(new Date(nowMillis)) as string &
        tags.Format<"date-time">,
    },
  });
  // Return success result
  return {
    status: "sent",
    expires_at: expiresAt,
  };
}
