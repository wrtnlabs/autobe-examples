import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuOptionGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionGroup";

export async function getShoppingMallShoppingMallSkuOptionGroupsCode(props: {
  code: string;
}): Promise<IShoppingMallSkuOptionGroup> {
  const record =
    await MyGlobal.prisma.shopping_mall_sku_option_groups.findUnique({
      where: { code: props.code },
    });

  if (!record) {
    throw new HttpException(
      `SKU Option Group with code '${props.code}' not found`,
      404,
    );
  }

  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: record.updated_at ? toISOStringSafe(record.updated_at) : null,
  };
}
