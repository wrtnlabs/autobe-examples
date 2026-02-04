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

export async function postShoppingMallSuperAdminAuthSuperAdminsEmailVerify(props: {
  superAdmin: SuperadminPayload;
}): Promise<IShoppingMallSuperAdminEmailVerification.ICreate> {
  const token = v4();
  const now = toISOStringSafe(new Date());
  const expiresAt = toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000));
  await MyGlobal.prisma.shopping_mall_super_admin_email_verifications.create({
    data: {
      id: v4(),
      token,
      super_admin_id: props.superAdmin.id,
      created_at: now,
      expires_at: expiresAt,
      used: false, // Added required 'used' property with default false value
    },
  });
  // IShoppingMallSuperAdminEmailVerification.ICreate is defined as {} - empty object
  // This endpoint returns a confirmation with message and token, but the DTO is empty.
  // However, the specification requires returning { message: "Verification email sent successfully", token: "..." }
  // But the DTO is explicitly {} per the schema, so we must return {}.
  // The system will handle the response structure separately.
  return {};
}
