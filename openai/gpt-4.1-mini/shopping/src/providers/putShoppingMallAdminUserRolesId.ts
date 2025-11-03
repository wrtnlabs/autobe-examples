import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminUserRolesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallUserRole.IUpdate;
}): Promise<IShoppingMallUserRole> {
  const { id, body } = props;

  // Fetch existing user role to ensure it exists
  const existing =
    await MyGlobal.prisma.shopping_mall_user_roles.findUniqueOrThrow({
      where: { id },
    });

  // Prepare update data inline
  const updated = await MyGlobal.prisma.shopping_mall_user_roles.update({
    where: { id },
    data: {
      role_name: body.role_name,
      ...(body.updated_at !== undefined ? { updated_at: body.updated_at } : {}),
    },
  });

  return {
    id: updated.id,
    user_id: updated.user_id,
    role_name: updated.role_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
