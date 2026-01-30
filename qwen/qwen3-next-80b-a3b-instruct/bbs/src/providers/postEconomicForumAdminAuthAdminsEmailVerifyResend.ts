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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postEconomicForumAdminAuthAdminsEmailVerifyResend(props: {
  admin: AdminPayload;
}): Promise<void> {
  const { id: adminId, session_id: sessionId, type: actorType } = props.admin;
  // Query for existing email verification records
  const existingVerifications =
    await MyGlobal.prisma.economic_forum_admin_email_verifications.findMany({
      where: {
        admin_id: adminId,
        verification_status: { in: ["pending", "expired"] },
      },
    });
  // If no valid verification records exist, return 404
  if (existingVerifications.length === 0) {
    throw new HttpException("No valid email verification record found", 404);
  }
  // For each existing verification, revoke it
  for (const verification of existingVerifications) {
    await MyGlobal.prisma.economic_forum_admin_email_verifications.update({
      where: { id: verification.id },
      data: { verification_status: "revoked" },
    });
  }
  // Create new verification record
  const newToken = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  const expiresAt = toISOStringSafe(
    new Date(now.getTime() + 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const createdAt = toISOStringSafe(now) as string & tags.Format<"date-time">;
  await MyGlobal.prisma.economic_forum_admin_email_verifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: adminId,
      token: newToken,
      expires_at: expiresAt,
      verification_status: "pending",
      created_at: createdAt,
      updated_at: createdAt,
    },
  });
  // Log audit entry
  await MyGlobal.prisma.economic_forum_system_audits.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_id: adminId,
      actor_type: actorType,
      action: "ADMIN_EMAIL_VERIFICATION_RESEND",
      audit_details: JSON.stringify({ admin_id: adminId }),
      created_at: createdAt,
    },
  });
  // Send email via notification service (assumed handled asynchronously by system)
  // No need to wait - action is complete once DB records are updated
}
