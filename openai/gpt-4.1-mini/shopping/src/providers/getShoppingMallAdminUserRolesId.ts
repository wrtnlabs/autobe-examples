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

export async function getShoppingMallAdminUserRolesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallUserRole> {
  const { id } = props;

  const userRole =
    await MyGlobal.prisma.shopping_mall_user_roles.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: userRole.id,
    user_id: userRole.user_id,
    role_name: userRole.role_name,
    created_at: toISOStringSafe(userRole.created_at),
    updated_at: toISOStringSafe(userRole.updated_at),
  };
}
