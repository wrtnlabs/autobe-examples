import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShoppingMallOrdersOrderIdOrderItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  // Verify the order exists and belongs to the customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    select: { id: true, shopping_mall_customer_id: true },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Pagination defaults and calculations
  const page = props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit > 0 && props.body.limit <= 100 ? props.body.limit : 100;
  const skip = (page - 1) * limit;

  // Build filtering conditions
  const where: Prisma.shopping_mall_order_itemsWhereInput = {
    shopping_mall_order_id: props.orderId satisfies string as string,
  };

  if (
    props.body.search != null &&
    props.body.search !== undefined &&
    props.body.search.trim() !== ""
  ) {
    where.OR = [
      { status: props.body.search },
      { shopping_mall_product_sku_id: props.body.search },
    ];
  }

  if (props.body.status != null) {
    where.status = props.body.status;
  }

  if (props.body.min_quantity != null) {
    where.quantity = { gte: props.body.min_quantity };
  }
  if (props.body.max_quantity != null) {
    where.quantity = Object.assign(where.quantity || {}, {
      lte: props.body.max_quantity,
    });
  }

  if (props.body.created_after != null) {
    where.created_at = Object.assign(where.created_at || {}, {
      gte: toISOStringSafe(props.body.created_after),
    });
  }
  if (props.body.created_before != null) {
    where.created_at = Object.assign(where.created_at || {}, {
      lte: toISOStringSafe(props.body.created_before),
    });
  }

  // Query order items with pagination
  const [orderItems, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({ where }),
  ]);

  // Map the result to ISummary
  const data = orderItems.map((item) => {
    return {
      id: item.id as string & tags.Format<"uuid">,
      order_id: item.shopping_mall_order_id as string & tags.Format<"uuid">,
      product: {
        id: item.shopping_mall_product_sku_id as string & tags.Format<"uuid">,
        code: "",
        name: "",
        is_active: false,
        created_at: "1970-01-01T00:00:00.000Z" as string &
          tags.Format<"date-time">,
        updated_at: "1970-01-01T00:00:00.000Z" as string &
          tags.Format<"date-time">,
        deleted_at: null,
      },
      quantity: item.quantity,
      price_per_unit: item.unit_price,
      total_price: item.unit_price * item.quantity,
      status: item.status,
    };
  });

  // Assemble pagination info
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
