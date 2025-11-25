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

export async function getShoppingMallAdminShoppingMallUserRolesShoppingMallUserRoleId(props: {
  admin: AdminPayload;
  shoppingMallUserRoleId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallUserRole> {
  const userRoleAssignment =
    await MyGlobal.prisma.shopping_mall_user_roles.findUnique({
      where: {
        id: props.shoppingMallUserRoleId,
      },
    });

  if (!userRoleAssignment) {
    throw new HttpException("User role assignment not found.", 404);
  }

  return {
    id: userRoleAssignment.id,
    shopping_mall_admin_id: userRoleAssignment.shopping_mall_admin_id,
    shopping_mall_role_id: userRoleAssignment.shopping_mall_role_id,
    created_at: toISOStringSafe(userRoleAssignment.created_at) as string &
      tags.Format<"date-time">,
    deleted_at: userRoleAssignment.deleted_at
      ? (toISOStringSafe(userRoleAssignment.deleted_at) as
          | (string & tags.Format<"date-time">)
          | null)
      : null,
  };
}
