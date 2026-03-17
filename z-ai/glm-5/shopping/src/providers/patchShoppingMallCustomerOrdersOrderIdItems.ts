import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
  orderId: string;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  // Verify order belongs to the customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause with merged date range filters
  const whereInput = {
    shopping_mall_order_id: props.orderId,
    ...(props.body.shopping_mall_seller_id !== undefined && {
      shopping_mall_seller_id: props.body.shopping_mall_seller_id,
    }),
    ...(props.body.shopping_mall_product_id !== undefined && {
      shopping_mall_product_id: props.body.shopping_mall_product_id,
    }),
    ...(props.body.shopping_mall_product_variant_id !== undefined && {
      shopping_mall_product_variant_id:
        props.body.shopping_mall_product_variant_id,
    }),
    ...(props.body.shopping_mall_shipment_id !== undefined && {
      shopping_mall_shipment_id: props.body.shopping_mall_shipment_id,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...((props.body.created_at_from !== undefined ||
      props.body.created_at_to !== undefined) && {
      created_at: {
        ...(props.body.created_at_from !== undefined && {
          gte: new Date(props.body.created_at_from),
        }),
        ...(props.body.created_at_to !== undefined && {
          lte: new Date(props.body.created_at_to),
        }),
      },
    }),
    ...((props.body.updated_at_from !== undefined ||
      props.body.updated_at_to !== undefined) && {
      updated_at: {
        ...(props.body.updated_at_from !== undefined && {
          gte: new Date(props.body.updated_at_from),
        }),
        ...(props.body.updated_at_to !== undefined && {
          lte: new Date(props.body.updated_at_to),
        }),
      },
    }),
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  // Build ORDER BY
  const sort = props.body.sort ?? "-created_at";
  const sortField = sort.startsWith("-") ? sort.substring(1) : sort;
  const sortDirection = sort.startsWith("-")
    ? ("desc" as const)
    : ("asc" as const);
  const orderByInput = {
    [sortField]: sortDirection,
  } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
  // Query data
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallOrderItemAtSummaryTransformer.select(),
  });
  // Query total count
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
