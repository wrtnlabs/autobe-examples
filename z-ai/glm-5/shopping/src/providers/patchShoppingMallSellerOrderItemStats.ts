import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemStat";
import { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderItemAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerOrderItemStats(props: {
  seller: SellerPayload;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IShoppingMallOrderItemStat> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Parse sort - default created_at DESC
  const sortStr = props.body.sort ?? "-created_at";
  const sortDescending = sortStr.startsWith("-");
  const sortField = sortDescending ? sortStr.substring(1) : sortStr;
  const validSortField = sortField === "status" ? "status" : "created_at";
  const sortDirection = sortDescending ? "desc" : "asc";
  // Build WHERE clause with seller authorization
  const whereInput = {
    shopping_mall_seller_id: props.seller.id,
    ...(props.body.status &&
      props.body.status.length > 0 && {
        status: { in: props.body.status },
      }),
    ...(props.body.search && {
      product_name: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.orderNumber && {
      order: {
        order_number: {
          contains: props.body.orderNumber,
          mode: "insensitive" as const,
        },
      },
    }),
    ...(props.body.createdFrom && {
      created_at: { gte: new Date(props.body.createdFrom) },
    }),
    ...(props.body.createdTo && {
      created_at: { lte: new Date(props.body.createdTo) },
    }),
    ...(props.body.productId && {
      shopping_mall_product_id: props.body.productId,
    }),
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  // 1. Status breakdown via groupBy
  const statusGroups = await MyGlobal.prisma.shopping_mall_order_items.groupBy({
    by: ["status"],
    where: whereInput,
    _count: { status: true },
  });
  const statusBreakdown: IShoppingMallOrderItemStat["statusBreakdown"] = {
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
  };
  let totalItems = 0;
  for (const group of statusGroups) {
    const count = group._count.status;
    totalItems += count;
    if (group.status === "paid") statusBreakdown.paid = count;
    else if (group.status === "shipped") statusBreakdown.shipped = count;
    else if (group.status === "delivered") statusBreakdown.delivered = count;
    else if (group.status === "cancelled") statusBreakdown.cancelled = count;
    else if (group.status === "refunded") statusBreakdown.refunded = count;
  }
  // 2. Pending cancellations count (items with pending cancellation requests)
  const pendingCancellationsResult =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: {
        status: "pending",
        orderItem: {
          shopping_mall_seller_id: props.seller.id,
          ...(props.body.status &&
            props.body.status.length > 0 && {
              status: { in: props.body.status },
            }),
          ...(props.body.productId && {
            shopping_mall_product_id: props.body.productId,
          }),
        },
      },
      select: { order_item_id: true },
    });
  const pendingCancellations = new Set(
    pendingCancellationsResult.map((r) => r.order_item_id),
  ).size;
  // 3. Aggregate quantity and calculate total value
  const aggregateItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: whereInput,
      select: { quantity: true, unit_price: true },
    });
  let totalQuantity = 0;
  let totalValue = 0;
  for (const item of aggregateItems) {
    totalQuantity += item.quantity;
    totalValue += item.quantity * item.unit_price;
  }
  // 4. Paginated data with transformer
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy:
      validSortField === "status"
        ? { status: sortDirection }
        : { created_at: sortDirection },
    ...ShoppingMallOrderItemAtSummaryTransformer.select(),
  });
  // Note: pendingRefunds would require shopping_mall_refund_requests table
  const pendingRefunds = 0;
  return {
    totalItems,
    pendingCancellations,
    pendingRefunds,
    statusBreakdown,
    totalQuantity,
    totalValue,
    pagination: {
      current: page,
      limit,
      records: totalItems,
      pages: Math.ceil(totalItems / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallOrderItemAtSummaryTransformer.transform,
    ),
  };
}
