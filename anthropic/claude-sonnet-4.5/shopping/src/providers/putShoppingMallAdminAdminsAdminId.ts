import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdmin.IUpdate;
}): Promise<IShoppingMallAdmin> {
  const { admin, adminId, body } = props;

  // STEP 1: Verify target admin exists
  const targetAdmin =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: { id: adminId },
    });

  // STEP 2: Authorization - verify requesting admin exists and is active
  const requestingAdmin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      id: admin.id,
      is_active: true,
      email_verified: true,
    },
  });

  if (!requestingAdmin) {
    throw new HttpException(
      "Unauthorized: Your admin account is not active or verified",
      403,
    );
  }

  // STEP 3: Business rule - Only super_admin can update other admins' profiles
  // Admins can update their own profile regardless of role
  if (
    requestingAdmin.id !== adminId &&
    requestingAdmin.role_level !== "super_admin"
  ) {
    throw new HttpException(
      "Unauthorized: Only super admins can update other admin accounts",
      403,
    );
  }

  // STEP 4: Prepare update timestamp
  const now = toISOStringSafe(new Date());

  // STEP 5: Perform update
  const updated = await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: adminId },
    data: {
      name: body.name ?? undefined,
      updated_at: now,
    },
  });

  // STEP 6: Return response with prepared timestamp
  return {
    id: updated.id as string & tags.Format<"uuid">,
    email: updated.email as string & tags.Format<"email">,
    name: updated.name,
    role_level: updated.role_level,
    is_active: updated.is_active,
    email_verified: updated.email_verified,
    mfa_enabled: updated.mfa_enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
