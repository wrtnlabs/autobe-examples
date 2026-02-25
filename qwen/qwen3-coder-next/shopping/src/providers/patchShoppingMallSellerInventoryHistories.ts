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

export async function patchShoppingMallSellerInventoryHistories(props: {
  seller: SellerPayload;
  body: IShoppingMallInventoryHistory.IRequest;
}): Promise<IPageIShoppingMallInventoryHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.shopping_mall_inventory_historiesWhereInput =
    {};
  if (props.body.shopping_mall_product_variant_id) {
    whereConditions.shopping_mall_product_variant_id =
      props.body.shopping_mall_product_variant_id;
  }
  if (props.body.shopping_mall_seller_id) {
    whereConditions.shopping_mall_seller_id =
      props.body.shopping_mall_seller_id;
  }
  if (props.body.shopping_mall_order_item_id) {
    whereConditions.shopping_mall_order_item_id =
      props.body.shopping_mall_order_item_id;
  }
  if (props.body.reason && props.body.reason.length > 0) {
    whereConditions.reason = {
      in: props.body.reason,
    };
  }
  if (props.body.created_at_range && props.body.created_at_range.length === 2) {
    const [startDate, endDate] = props.body.created_at_range;
    whereConditions.created_at = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }
  const orderByCondition =
    props.body.sort_by === "quantity_change"
      ? { quantity_change: props.body.sort_order ?? "desc" }
      : { created_at: props.body.sort_order ?? "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory_histories.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: orderByCondition,
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
    }),
    MyGlobal.prisma.shopping_mall_inventory_histories.count({
      where: whereConditions,
    }),
  ]);
  const totalPages = Math.ceil(total / limit);
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      quantity_change: record.quantity_change as number & tags.Type<"int32">,
      reason: record.reason,
      created_at: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
      metadata: record.metadata as string | null | undefined,
      shopping_mall_product_variant_id:
        record.shopping_mall_product_variant_id as string & tags.Format<"uuid">,
      shopping_mall_order_item_id: record.shopping_mall_order_item_id as
        | (string & tags.Format<"uuid">)
        | null,
      shopping_mall_seller_id: record.shopping_mall_seller_id as
        | (string & tags.Format<"uuid">)
        | null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallInventoryHistory.ISummary;
}
