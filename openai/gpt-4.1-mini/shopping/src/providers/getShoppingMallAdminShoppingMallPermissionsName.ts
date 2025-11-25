import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminShoppingMallPermissionsName(props: {
  admin: AdminPayload;
  name: string;
}): Promise<IShoppingMallPermission> {
  const permission = await MyGlobal.prisma.shopping_mall_permissions.findUnique(
    {
      where: { name: props.name },
    },
  );

  if (!permission) {
    throw new HttpException("Permission not found", 404);
  }

  return {
    id: permission.id,
    name: permission.name,
    label: permission.label,
    description:
      permission.description === null ? undefined : permission.description,
    created_at: toISOStringSafe(permission.created_at),
    updated_at: toISOStringSafe(permission.updated_at),
  };
}
