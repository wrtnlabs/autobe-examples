import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerInventoryHistory(props: {
  seller: SellerPayload;
  body: IShoppingMallInventoryHistory.IRequest;
}): Promise<IPageIShoppingMallInventoryHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_inventory_historiesWhereInput = {
    shopping_mall_product_variant_id: props.body
      .shopping_mall_product_variant_id
      ? { equals: props.body.shopping_mall_product_variant_id }
      : undefined,
    shopping_mall_order_item_id: props.body.shopping_mall_order_item_id
      ? { equals: props.body.shopping_mall_order_item_id }
      : undefined,
    reason: props.body.reason ? { in: props.body.reason } : undefined,
    created_at: props.body.created_at_range
      ? {
          gte: props.body.created_at_range[0],
          lte: props.body.created_at_range[1],
        }
      : undefined,
    shopping_mall_seller_id: props.seller.id
      ? { equals: props.seller.id }
      : undefined,
  } satisfies Prisma.shopping_mall_inventory_historiesWhereInput;
  const orderBy:
    | Prisma.shopping_mall_inventory_historiesOrderByWithRelationInput
    | Prisma.shopping_mall_inventory_historiesOrderByWithRelationInput[] =
    props.body.sort_by === "quantity_change"
      ? {
          quantity_change: props.body.sort_order === "asc" ? "asc" : "desc",
        }
      : {
          created_at: props.body.sort_order === "asc" ? "asc" : "desc",
        };
  const data = await MyGlobal.prisma.shopping_mall_inventory_histories.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        metadata: true,
        shopping_mall_product_variant_id: true,
        shopping_mall_order_item_id: true,
        shopping_mall_seller_id: true,
      },
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_inventory_histories.count({
    where,
  });
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      quantity_change: record.quantity_change,
      reason: record.reason,
      created_at: toISOStringSafe(record.created_at),
      metadata: record.metadata ?? null,
      shopping_mall_product_variant_id:
        record.shopping_mall_product_variant_id as string & tags.Format<"uuid">,
      shopping_mall_order_item_id: record.shopping_mall_order_item_id
        ? (record.shopping_mall_order_item_id as string & tags.Format<"uuid">)
        : null,
      shopping_mall_seller_id: record.shopping_mall_seller_id
        ? (record.shopping_mall_seller_id as string & tags.Format<"uuid">)
        : null,
    })),
    pagination: {
      current: page satisfies number & tags.Type<"int32">,
      limit: limit satisfies number & tags.Type<"int32">,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
