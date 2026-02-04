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
import { IShoppingMallSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminEmailVerification";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";

export async function postShoppingMallSuperAdminAuthSuperAdminsEmailResend(props: {
  superAdmin: SuperadminPayload;
}): Promise<IShoppingMallSuperAdminEmailVerification> {
  // Verify super admin exists and is active (already validated by auth)
  const superadmin =
    await MyGlobal.prisma.shopping_mall_super_admins.findUnique({
      where: {
        id: props.superAdmin.id,
        deleted_at: null,
      },
    });
  if (!superadmin) {
    throw new HttpException("Super administrator not found", 404);
  }
  // Query existing unverified verification record with 24-hour expiration window
  const now = toISOStringSafe(new Date());
  const expiration = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
  const expiredAt = toISOStringSafe(expiration);
  const existingVerification =
    await MyGlobal.prisma.shopping_mall_super_admin_email_verifications.findFirst(
      {
        where: {
          super_admin_id: props.superAdmin.id,
          status: "pending" as any,
          expired_at: {
            gte: now,
          },
        } as any,
      },
    );
  // If a valid unverified token exists within 24 hours, return 429 Too Many Requests
  if (existingVerification) {
    throw new HttpException(
      "Verification email resent too recently. Please wait before requesting another.",
      429,
    );
  }
  // Generate new 64-character cryptographically secure random token
  const newToken = Math.random().toString(36).substring(2, 66);
  // Insert new verification record
  await MyGlobal.prisma.shopping_mall_super_admin_email_verifications.create({
    data: {
      id: v4(),
      super_admin_id: props.superAdmin.id,
      token: newToken,
      status: "pending" as any,
      created_at: now,
      expired_at: expiredAt,
      used_at: null,
      attempt_count: 0,
    } as any,
  });
  // Return success message
  return {
    message: "Verification email resent successfully",
  };
}
