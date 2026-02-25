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
import { ShoppingMallInventoryHistoryAtSummaryTransformer } from "../transformers/ShoppingMallInventoryHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerInventoryHistoryVariantsVariantId(props: {
  seller: SellerPayload;
  variantId: string;
  body: IShoppingMallInventoryHistory.IRequest;
}): Promise<IPageIShoppingMallInventoryHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_inventory_historiesWhereInput = {
    shopping_mall_product_variant_id: props.variantId,
  };
  if (props.body.reason && props.body.reason.length > 0) {
    where.reason = { in: props.body.reason };
  }
  if (props.body.created_at_range && props.body.created_at_range.length === 2) {
    where.created_at = {
      gte: props.body.created_at_range[0],
      lte: props.body.created_at_range[1],
    };
  }
  if (props.body.shopping_mall_order_item_id) {
    where.shopping_mall_order_item_id = props.body.shopping_mall_order_item_id;
  }
  if (props.body.shopping_mall_seller_id) {
    where.shopping_mall_seller_id = props.body.shopping_mall_seller_id;
  }
  const orderBy: Prisma.shopping_mall_inventory_historiesOrderByWithRelationInput =
    props.body.sort_by === "created_at"
      ? { created_at: props.body.sort_order === "asc" ? "asc" : "desc" }
      : props.body.sort_by === "quantity_change"
        ? { quantity_change: props.body.sort_order === "asc" ? "asc" : "desc" }
        : { created_at: "desc" };
  const data = await MyGlobal.prisma.shopping_mall_inventory_histories.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy,
      ...ShoppingMallInventoryHistoryAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_inventory_histories.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallInventoryHistoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
