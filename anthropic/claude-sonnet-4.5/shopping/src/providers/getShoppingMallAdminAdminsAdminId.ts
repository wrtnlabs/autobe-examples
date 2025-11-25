import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdmin> {
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: {
      id: props.adminId,
    },
  });

  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }

  return {
    id: admin.id,
    email: admin.email,
    password_hash: admin.password_hash,
    full_name: admin.full_name,
    phone_number: admin.phone_number,
    admin_level: typia.assert<"super_admin" | "moderator" | "support">(
      admin.admin_level,
    ),
    email_verified: admin.email_verified,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
  };
}
