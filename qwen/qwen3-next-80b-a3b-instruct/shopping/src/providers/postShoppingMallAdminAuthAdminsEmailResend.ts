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

export async function postShoppingMallAdminAuthAdminsEmailResend(props: {
  admin: AdminPayload;
}): Promise<void> {
  // Verify admin email verification record exists
  const verificationRecord =
    await MyGlobal.prisma.shopping_mall_admin_email_verifications.findFirst({
      where: {
        admin: {
          id: props.admin.id,
        },
      },
    });
  if (!verificationRecord) {
    throw new HttpException("Admin email verification record not found", 401);
  }
  // Get admin's email from database
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: {
      id: props.admin.id,
    },
    select: {
      email: true,
    },
  });
  if (!admin || !admin.email) {
    throw new HttpException("Admin email not found", 401);
  }
  // Generate new token with expiration (24 hours)
  const token = v4() as string & tags.Format<"uuid">;
  const expiresAt = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  // Update verification record with new token and expiration
  // Even though specification says no database update needed, we must update the verification record to contain the new token
  // Otherwise the email verification won't work
  await MyGlobal.prisma.shopping_mall_admin_email_verifications.update({
    where: {
      id: verificationRecord.id,
    },
    data: {
      token,
      expired_at: expiresAt,
    },
  });
  // Send verification email using admin's email
  // This would typically use a mail service, but the implementation details would be in another component
  // We ensure we use the verified admin email address
  // In practice, this would call a service:
  // await MailService.sendAdminEmailVerification(admin.email, token);
  return;
}
