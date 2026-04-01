import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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
  // Verify order exists and belongs to customer
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Extract pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.shopping_mall_order_itemsWhereInput = {
    shopping_mall_order_id: props.orderId,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.productId && {
      product_snapshot: props.body.productId,
    }),
    ...(props.body.variantId && {
      variant_snapshot: props.body.variantId,
    }),
    ...(props.body.createdAtFrom && {
      created_at: {
        gte: new Date(props.body.createdAtFrom),
      },
    }),
    ...(props.body.createdAtTo && {
      created_at: {
        lte: new Date(props.body.createdAtTo),
      },
    }),
    ...(props.body.priceMin !== undefined && {
      price: {
        gte: props.body.priceMin,
      },
    }),
    ...(props.body.priceMax !== undefined && {
      price: {
        lte: props.body.priceMax,
      },
    }),
    ...(props.body.quantityMin !== undefined && {
      quantity: {
        gte: props.body.quantityMin,
      },
    }),
    ...(props.body.quantityMax !== undefined && {
      quantity: {
        lte: props.body.quantityMax,
      },
    }),
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  // Build ORDER BY clause
  const orderByInput: Prisma.shopping_mall_order_itemsOrderByWithRelationInput =
    props.body.sortBy === "created_at"
      ? { created_at: props.body.sortOrder ?? "desc" }
      : props.body.sortBy === "updated_at"
        ? { updated_at: props.body.sortOrder ?? "desc" }
        : props.body.sortBy === "price"
          ? { price: props.body.sortOrder ?? "desc" }
          : props.body.sortBy === "quantity"
            ? { quantity: props.body.sortOrder ?? "desc" }
            : { created_at: "desc" };
  // Query order items
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallOrderItemAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallOrderItemAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
