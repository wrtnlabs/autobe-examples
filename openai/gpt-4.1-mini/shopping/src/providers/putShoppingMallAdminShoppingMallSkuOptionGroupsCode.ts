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

export async function putShoppingMallAdminShoppingMallSkuOptionGroupsCode(props: {
  admin: AdminPayload;
  code: string;
  body: IShoppingMallSkuOptionGroup.IUpdate;
}): Promise<IShoppingMallSkuOptionGroup> {
  const existing =
    await MyGlobal.prisma.shopping_mall_sku_option_groups.findUnique({
      where: { code: props.code },
    });

  if (!existing) {
    throw new HttpException("SKU Option Group not found", 404);
  }

  const now = toISOStringSafe(new Date());

  const nameToUpdate =
    props.body.name === undefined
      ? existing.name === null
        ? undefined
        : existing.name
      : props.body.name === null
        ? undefined
        : props.body.name;

  const descriptionToUpdate =
    props.body.description === undefined
      ? existing.description === null
        ? undefined
        : existing.description
      : props.body.description === null
        ? undefined
        : props.body.description;

  const updated = await MyGlobal.prisma.shopping_mall_sku_option_groups.update({
    where: { code: props.code },
    data: {
      name: nameToUpdate,
      description: descriptionToUpdate,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    description: updated.description === null ? null : updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at:
      updated.updated_at === null ? null : toISOStringSafe(updated.updated_at),
  };
}
