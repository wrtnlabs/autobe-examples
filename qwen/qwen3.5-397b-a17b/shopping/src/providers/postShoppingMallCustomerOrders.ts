import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
  // Validate customer has active cart with items
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirstOrThrow({
    where: {
      shopping_customer_id: props.customer.id,
      deleted_at: null,
    },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });
  if (cart.items.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }
  // Verify all cart items are available (in stock)
  for (const item of cart.items) {
    if (item.variant.stock_quantity < item.quantity) {
      throw new HttpException(
        `Insufficient stock for product variant ${item.variant.sku_code}`,
        400,
      );
    }
  }
  // Execute order creation in transaction
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create order using collector (modified to use transaction client)
    const orderData = await ShoppingMallOrderCollector.collect({
      body: props.body,
      customer: { id: props.customer.id },
    });
    const order = await tx.shopping_mall_orders.create({
      data: orderData,
      ...ShoppingMallOrderTransformer.select(),
    });
    // Create inventory records for stock decrease
    for (const item of cart.items) {
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          product_variant_id: item.variant.id,
          quantity_change: -item.quantity,
          reason: "ORDER",
          created_at: new Date(),
        },
      });
      // Update variant stock quantity
      await tx.shopping_mall_product_variants.update({
        where: { id: item.variant.id },
        data: {
          stock_quantity: item.variant.stock_quantity - item.quantity,
          updated_at: new Date(),
        },
      });
    }
    // Clear cart items after successful order creation
    await tx.shopping_mall_cart_items.deleteMany({
      where: {
        shopping_mall_cart_id: cart.id,
      },
    });
    return order;
  });
  return await ShoppingMallOrderTransformer.transform(created);
}
