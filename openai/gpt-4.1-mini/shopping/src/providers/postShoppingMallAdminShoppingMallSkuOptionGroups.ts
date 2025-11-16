import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuOptionGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionGroup";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminShoppingMallSkuOptionGroups(props: {
  admin: AdminPayload;
  body: IShoppingMallSkuOptionGroup.ICreate;
}): Promise<IShoppingMallSkuOptionGroup> {
  const id: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_sku_option_groups.create({
    data: {
      id,
      code: props.body.code,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    code: created.code,
    name: created.name,
    description:
      created.description === undefined ? undefined : created.description,
    created_at: toISOStringSafe(created.created_at),
    updated_at:
      created.updated_at === null ? null : toISOStringSafe(created.updated_at),
  };
}
