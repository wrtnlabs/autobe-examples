import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  const whereInput: Prisma.shopping_mall_order_itemsWhereInput = {
    shopping_mall_order_id: props.orderId,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.seller_id !== undefined && {
      seller: { id: props.body.seller_id },
    }),
    ...(props.body.customer_id !== undefined && {
      order: { customer_id: props.body.customer_id },
    }),
    ...(props.body.date_from !== undefined && {
      created_at: { gte: new Date(props.body.date_from) },
    }),
    ...(props.body.date_to !== undefined && {
      created_at: { lte: new Date(props.body.date_to) },
    }),
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  const validSortFields = [
    "created_at",
    "status",
    "quantity",
    "unit_price",
    "updated_at",
  ] as const;
  const sortParts = props.body.sort?.split(",") ?? [];
  const rawSortField = sortParts[0] ?? "created_at";
  const sortField = validSortFields.includes(
    rawSortField as (typeof validSortFields)[number],
  )
    ? (rawSortField as (typeof validSortFields)[number])
    : "created_at";
  const rawSortDirection = sortParts[1] ?? "desc";
  const sortDirection = rawSortDirection === "asc" ? "asc" : "desc";
  const orderByInput: Prisma.shopping_mall_order_itemsOrderByWithRelationInput =
    {
      [sortField]: sortDirection,
    } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallOrderItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallOrderItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
