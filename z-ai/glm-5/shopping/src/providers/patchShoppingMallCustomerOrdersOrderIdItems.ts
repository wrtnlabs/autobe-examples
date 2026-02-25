import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
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
  // 1. Verify order exists and belongs to the customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Build pagination and filters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_order_id: props.orderId,
    ...(props.body.status !== undefined &&
      props.body.status.length > 0 && { status: { in: props.body.status } }),
    ...(props.body.search !== undefined && {
      product_name: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.productId !== undefined && {
      shopping_mall_product_id: props.body.productId,
    }),
    ...(props.body.createdFrom !== undefined && {
      created_at: { gte: new Date(props.body.createdFrom) },
    }),
    ...(props.body.createdTo !== undefined && {
      created_at: { lte: new Date(props.body.createdTo) },
    }),
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  // Parse sort (default: -created_at for newest first)
  const sortField =
    props.body.sort !== undefined && props.body.sort.startsWith("-")
      ? props.body.sort.substring(1)
      : (props.body.sort ?? "created_at");
  const sortDirection =
    props.body.sort !== undefined && props.body.sort.startsWith("-")
      ? ("desc" as const)
      : props.body.sort !== undefined
        ? ("asc" as const)
        : ("desc" as const);
  const orderByInput = (
    sortField === "status"
      ? { status: sortDirection }
      : { created_at: sortDirection }
  ) satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
  // 3. Execute query with transformer select
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
  // 4. Transform and return paginated response
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
