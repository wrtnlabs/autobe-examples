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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallInventoryHistoryAtSummaryTransformer } from "../transformers/ShoppingMallInventoryHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminInventoryHistoryVariantsVariantId(props: {
  admin: AdminPayload;
  variantId: string;
  body: IShoppingMallInventoryHistory.IRequest;
}): Promise<IPageIShoppingMallInventoryHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause with all optional filters
  const whereInput = {
    shopping_mall_product_variant_id: props.variantId,
    ...(props.body.reason && {
      reason: { in: props.body.reason },
    }),
    ...(props.body.created_at_range && {
      created_at: {
        gte: props.body.created_at_range[0],
        lte: props.body.created_at_range[1],
      },
    }),
    ...(props.body.shopping_mall_order_item_id && {
      shopping_mall_order_item_id: props.body.shopping_mall_order_item_id,
    }),
    ...(props.body.shopping_mall_seller_id && {
      shopping_mall_seller_id: props.body.shopping_mall_seller_id,
    }),
  } satisfies Prisma.shopping_mall_inventory_historiesWhereInput;
  // Build ORDER BY clause
  const orderByInput = (
    props.body.sort_by === "quantity_change"
      ? { quantity_change: props.body.sort_order ?? "desc" }
      : { created_at: props.body.sort_order ?? "desc" }
  ) satisfies Prisma.shopping_mall_inventory_historiesOrderByWithRelationInput;
  // Fetch data
  const data = await MyGlobal.prisma.shopping_mall_inventory_histories.findMany(
    {
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...ShoppingMallInventoryHistoryAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_inventory_histories.count({
    where: whereInput,
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
