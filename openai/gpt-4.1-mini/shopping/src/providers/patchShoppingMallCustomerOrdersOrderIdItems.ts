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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const { customer, orderId, body } = props;
  // Validate order existence and ownership
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (!order || order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Order not found or access denied", 404);
  }
  // Construct the where filters for order items
  const where: Prisma.shopping_mall_order_itemsWhereInput = {
    shopping_mall_order_id: orderId,
    deleted_at: null,
  };
  // Set pagination defaults
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Fetch order items WITHOUT nested relations
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  // Extract variant ids to fetch product variants info
  const variantIds = orderItems.map(
    (item) => item.shopping_mall_product_variant_id,
  );
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: { id: { in: variantIds } },
    });
  // Map variants by id for quick lookup
  const variantMap = new Map(variants.map((v) => [v.id, v]));
  // Fetch total count
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where,
  });
  // Construct summary list
  const summaryList = orderItems.map((item) => {
    const variant =
      variantMap.get(item.shopping_mall_product_variant_id) ?? null;
    return {
      id: item.id as string & tags.Format<"uuid">,
      shopping_mall_order_id: item.shopping_mall_order_id as string &
        tags.Format<"uuid">,
      shopping_mall_product_variant_id:
        item.shopping_mall_product_variant_id as string & tags.Format<"uuid">,
      quantity: item.quantity,
      status: item.status,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
      product_variant: variant
        ? {
            id: variant.id as string & tags.Format<"uuid">,
            price: variant.price_override ?? null,
            stock_quantity: variant.stock_quantity,
          }
        : null,
    };
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaryList,
  };
}
