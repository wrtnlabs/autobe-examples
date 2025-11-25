import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrdersOrderNumberItems(props: {
  customer: CustomerPayload;
  orderNumber: string;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  // Find the order by order_number
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: {
      order_number: props.orderNumber,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Extract pagination and sorting parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build the orderBy object based on sortBy
  const orderBy: Record<string, unknown> = {};
  if (props.body.sortBy) {
    orderBy[props.body.sortBy] = props.body.order === "desc" ? "desc" : "asc";
  } else {
    orderBy.created_at = "desc";
  }

  // Build the where clause
  const where: Record<string, unknown> = {
    shopping_mall_order_id: order.id,
  };

  // Add variantId filter if provided
  if (props.body.variantId) {
    where.shopping_mall_product_variant_id = props.body.variantId;
  }

  // Add search filter if provided
  if (props.body.search) {
    where.OR = [
      { notes: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Add minQuantity filter if provided
  if (props.body.minQuantity !== undefined) {
    where.quantity = { gte: props.body.minQuantity };
  }

  // Query the order items with pagination and sorting, including the product variant
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        productVariant: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({ where }),
  ]);

  // Transform the items to match the ISummary interface
  const summaryItems = items.map((item) => ({
    id: item.id,
    productId: item.productVariant?.shopping_mall_product_id ?? "",
    variantId:
      item.shopping_mall_product_variant_id !== null
        ? (item.shopping_mall_product_variant_id satisfies string as string)
        : "",
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalAmount: item.item_total,
  }));

  // Return the paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaryItems,
  };
}
