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

export async function putShoppingMallAdminShoppingMallPermissionsName(props: {
  admin: AdminPayload;
  name: string;
  body: IShoppingMallPermission.ICreate;
}): Promise<IShoppingMallPermission> {
  const existing = await MyGlobal.prisma.shopping_mall_permissions.findUnique({
    where: { name: props.name },
  });

  if (!existing) {
    throw new HttpException("Permission not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_permissions.update({
    where: { name: props.name },
    data: {
      label: props.body.label,
      description: props.body.description ?? null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    label: updated.label,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
