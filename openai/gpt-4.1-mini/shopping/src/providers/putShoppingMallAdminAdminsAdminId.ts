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
  const existing = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { id: props.adminId },
  });

  if (existing === null) {
    throw new HttpException("Admin user not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.adminId },
    data: {
      name: props.body.name ?? existing.name,
      email: props.body.email ?? existing.email,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: existing.status, // 'role' does not exist in DB, use 'status' as fallback
    is_active: existing.status !== "inactive", // derive is_active from status
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
