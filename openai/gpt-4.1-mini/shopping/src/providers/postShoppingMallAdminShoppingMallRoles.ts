import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminShoppingMallRoles(props: {
  admin: AdminPayload;
  body: IShoppingMallRole.ICreate;
}): Promise<IShoppingMallRole> {
  const existing = await MyGlobal.prisma.shopping_mall_roles.findUnique({
    where: { name: props.body.name },
  });

  if (existing) {
    throw new HttpException(
      `Role name '${props.body.name}' already exists.`,
      400,
    );
  }

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;

  const created = await MyGlobal.prisma.shopping_mall_roles.create({
    data: {
      id,
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
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
