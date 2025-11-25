import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminShoppingMallUserRoles(props: {
  admin: AdminPayload;
  body: IShoppingMallUserRole.ICreate;
}): Promise<IShoppingMallUserRole> {
  const existing = await MyGlobal.prisma.shopping_mall_user_roles.findUnique({
    where: {
      shopping_mall_admin_id_shopping_mall_role_id: {
        shopping_mall_admin_id: props.body.shopping_mall_user_id,
        shopping_mall_role_id: props.body.shopping_mall_role_id,
      },
    },
  });

  if (existing && existing.deleted_at === null) {
    throw new HttpException("User role association already exists.", 409);
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_user_roles.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.body.shopping_mall_user_id,
      shopping_mall_role_id: props.body.shopping_mall_role_id,
      created_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_admin_id: created.shopping_mall_admin_id,
    shopping_mall_role_id: created.shopping_mall_role_id,
    created_at: toISOStringSafe(created.created_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
