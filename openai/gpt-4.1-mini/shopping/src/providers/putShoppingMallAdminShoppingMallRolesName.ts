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

export async function putShoppingMallAdminShoppingMallRolesName(props: {
  admin: AdminPayload;
  name: string;
  body: IShoppingMallRole.IUpdate;
}): Promise<IShoppingMallRole> {
  const existing = await MyGlobal.prisma.shopping_mall_roles.findUnique({
    where: { name: props.name },
  });

  if (!existing) {
    throw new HttpException(`Role '${props.name}' not found`, 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_roles.update({
    where: { name: props.name },
    data: {
      label: props.body.label ?? existing.label,
      description:
        props.body.description === undefined
          ? existing.description
          : props.body.description,
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
