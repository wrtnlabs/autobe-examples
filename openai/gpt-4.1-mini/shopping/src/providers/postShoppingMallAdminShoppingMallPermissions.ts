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

export async function postShoppingMallAdminShoppingMallPermissions(props: {
  admin: AdminPayload;
  body: IShoppingMallPermission.ICreate;
}): Promise<IShoppingMallPermission> {
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_permissions.create({
    data: {
      id: v4(),
      name: props.body.name,
      label: props.body.label,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    name: created.name,
    label: created.label,
    description: created.description,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
