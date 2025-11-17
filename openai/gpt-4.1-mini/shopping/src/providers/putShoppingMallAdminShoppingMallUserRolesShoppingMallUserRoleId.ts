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

export async function putShoppingMallAdminShoppingMallUserRolesShoppingMallUserRoleId(props: {
  admin: AdminPayload;
  shoppingMallUserRoleId: string & tags.Format<"uuid">;
  body: IShoppingMallUserRole.IUpdate;
}): Promise<IShoppingMallUserRole> {
  const existing = await MyGlobal.prisma.shopping_mall_user_roles.findUnique({
    where: { id: props.shoppingMallUserRoleId },
  });
  if (!existing) {
    throw new HttpException(
      "Shopping mall user role association not found",
      404,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_user_roles.update({
    where: { id: props.shoppingMallUserRoleId },
    data: {
      ...(props.body.shopping_mall_user_id !== undefined && {
        shopping_mall_admin_id: props.body.shopping_mall_user_id,
      }),
      ...(props.body.shopping_mall_role_id !== undefined && {
        shopping_mall_role_id: props.body.shopping_mall_role_id,
      }),
    },
  });

  return {
    id: updated.id,
    shopping_mall_admin_id: updated.shopping_mall_admin_id,
    shopping_mall_role_id: updated.shopping_mall_role_id,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
