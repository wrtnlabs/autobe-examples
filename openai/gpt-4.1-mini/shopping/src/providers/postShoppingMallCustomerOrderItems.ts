import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallOrderItemCollector } from "../collectors/ShoppingMallOrderItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemTransformer } from "../transformers/ShoppingMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrderItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrderItem.ICreate;
}): Promise<IShoppingMallOrderItem> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.body.shoppingMallOrderId,
      shopping_mall_customer_id: props.customer.id,
      order_status: { in: ["paid", "shipped", "delivered"] },
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found or not modifiable", 404);
  }
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.body.shoppingMallProductVariantId },
      select: { stock_quantity: true },
    });
  if (!productVariant) {
    throw new HttpException("Product variant not found", 404);
  }
  if (productVariant.stock_quantity < props.body.quantity) {
    throw new HttpException("Insufficient stock", 400);
  }
  const createdAt: string & tags.Format<"date-time"> = new Date().toISOString();
  const updatedAt: string & tags.Format<"date-time"> = createdAt;
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const data = await ShoppingMallOrderItemCollector.collect({
      body: props.body,
    });
    const record = await tx.shopping_mall_order_items.create({
      data: {
        ...data,
        created_at: createdAt,
        updated_at: updatedAt,
      },
      ...ShoppingMallOrderItemTransformer.select(),
    });
    return record;
  });
  return await ShoppingMallOrderItemTransformer.transform(created);
}
