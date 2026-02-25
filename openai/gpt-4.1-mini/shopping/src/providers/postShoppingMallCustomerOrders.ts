import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallOrderCollector } from "../collectors/ShoppingMallOrderCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Validate stock availability
    for (const item of props.body.orderItems) {
      const variant = await tx.shopping_mall_product_variants.findUnique({
        where: { id: item.shoppingMallProductVariantId },
        select: { stock_quantity: true },
      });
      if (!variant) {
        throw new HttpException(
          `Product variant ${item.shoppingMallProductVariantId} not found`,
          400,
        );
      }
      if (variant.stock_quantity < item.quantity) {
        throw new HttpException(
          `Insufficient stock for variant ${item.shoppingMallProductVariantId}`,
          400,
        );
      }
    }
    // Deduct stock by creating inventory history records
    for (const item of props.body.orderItems) {
      await tx.shopping_mall_inventory_histories.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id: item.shoppingMallProductVariantId,
          reason: "order",
          quantity_delta: -item.quantity,
          created_at: toISOStringSafe(new Date()) as string &
            tags.Format<"date-time">,
          updated_at: toISOStringSafe(new Date()) as string &
            tags.Format<"date-time">,
        },
      });
    }
    // Create order record
    const orderCreateInput = await ShoppingMallOrderCollector.collect({
      body: props.body,
      customer: props.customer,
    });
    const createdOrder = await tx.shopping_mall_orders.create({
      data: orderCreateInput,
      ...ShoppingMallOrderTransformer.select(),
    });
    // TODO: Remove purchased items from shopping cart (no cart schema provided)
    // Fetch full order with transformed data
    const order = await tx.shopping_mall_orders.findUniqueOrThrow({
      where: { id: createdOrder.id },
      ...ShoppingMallOrderTransformer.select(),
    });
    return await ShoppingMallOrderTransformer.transform(order);
  });
}
