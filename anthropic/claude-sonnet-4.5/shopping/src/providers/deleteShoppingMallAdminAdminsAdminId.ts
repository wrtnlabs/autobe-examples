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

export async function deleteShoppingMallAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdmin> {
  // Prevent self-deletion - admin cannot delete their own account
  if (props.admin.id === props.adminId) {
    throw new HttpException("Cannot delete your own admin account", 403);
  }

  // Find the target admin to ensure it exists before deletion
  const targetAdmin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: {
      id: props.adminId,
    },
  });

  if (!targetAdmin) {
    throw new HttpException("Admin account not found", 404);
  }

  // Perform hard deletion - this will cascade to related sessions
  const deletedAdmin = await MyGlobal.prisma.shopping_mall_admins.delete({
    where: {
      id: props.adminId,
    },
  });

  // Return the deleted admin information with proper type conversion
  return {
    id: deletedAdmin.id,
    email: deletedAdmin.email,
    password_hash: deletedAdmin.password_hash,
    full_name: deletedAdmin.full_name,
    phone_number: deletedAdmin.phone_number,
    admin_level: typia.assert<"super_admin" | "moderator" | "support">(
      deletedAdmin.admin_level,
    ),
    email_verified: deletedAdmin.email_verified,
    created_at: toISOStringSafe(deletedAdmin.created_at),
    updated_at: toISOStringSafe(deletedAdmin.updated_at),
    deleted_at: deletedAdmin.deleted_at
      ? toISOStringSafe(deletedAdmin.deleted_at)
      : null,
  };
}
