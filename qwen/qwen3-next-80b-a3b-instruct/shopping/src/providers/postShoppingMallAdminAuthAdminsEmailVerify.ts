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
import { IShoppingMallAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminEmailVerification";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminAuthAdminsEmailVerify(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminEmailVerification;
}): Promise<IShoppingMallAdminEmailVerification> {
  const { token } = props.body;
  // Find the verification record
  const verificationRecord =
    await MyGlobal.prisma.shopping_mall_admin_email_verifications.findUnique({
      where: { token },
    });
  // If token doesn't exist or is expired, throw error
  if (!verificationRecord) {
    throw new HttpException("Invalid or expired verification token", 400);
  }
  // Check if expired (expired_at is null or in the future)
  if (
    verificationRecord.expired_at &&
    verificationRecord.expired_at < new Date()
  ) {
    throw new HttpException("Invalid or expired verification token", 400);
  }
  // Update the corresponding admin account's email verification status
  await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: verificationRecord.admin_id },
    data: { is_email_verified: true },
  });
  // Invalidate the token - delete the verification record
  await MyGlobal.prisma.shopping_mall_admin_email_verifications.delete({
    where: { token },
  });
  // Return the same token as confirmation
  return props.body;
}
