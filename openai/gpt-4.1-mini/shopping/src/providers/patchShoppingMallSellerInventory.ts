import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventory";
import { IPageIShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerInventory(props: {
  seller: SellerPayload;
  body: IShoppingMallInventory.IRequest;
}): Promise<IPageIShoppingMallInventory.ISummary> {
  const { seller, body } = props;

  // Pagination defaults
  const page = body.page === null || body.page === undefined ? 1 : body.page;
  const limit =
    body.limit === null || body.limit === undefined ? 10 : body.limit;
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    deleted_at: null,
    ...(body.shopping_mall_sku_id !== undefined &&
      body.shopping_mall_sku_id !== null && {
        shopping_mall_sku_id: body.shopping_mall_sku_id,
      }),
    ...(body.quantity !== undefined &&
      body.quantity !== null && {
        quantity: body.quantity,
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_sku_id: true,
        quantity: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_inventory.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: results.map((item) => ({
      id: item.id,
      shopping_mall_sku_id: item.shopping_mall_sku_id,
      quantity: item.quantity,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
