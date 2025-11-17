import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminShoppingMallRolesName(props: {
  admin: AdminPayload;
  name: string;
}): Promise<IShoppingMallRole> {
  const role = await MyGlobal.prisma.shopping_mall_roles.findUnique({
    where: { name: props.name },
  });

  if (!role) {
    throw new HttpException(
      `Shopping mall role with name '${props.name}' not found`,
      404,
    );
  }

  return {
    id: role.id,
    name: role.name,
    label: role.label,
    description: role.description ?? null,
    created_at: toISOStringSafe(role.created_at),
    updated_at: toISOStringSafe(role.updated_at),
  };
}
