import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
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
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCheckoutComplete(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  // 1. Validate address ownership
  const address =
    await MyGlobal.prisma.shopping_mall_addresses.findFirstOrThrow({
      where: {
        id: props.body.addressId,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  // 2. Retrieve cart with items including variant, product, and seller data
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirstOrThrow({
    where: {
      shopping_mall_customer_id: props.customer.id,
    },
    select: {
      id: true,
      items: {
        select: {
          id: true,
          quantity: true,
          unavailable: true,
          variant: {
            select: {
              id: true,
              option_values: true,
              price: true,
              deleted_at: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  base_price: true,
                  deleted_at: true,
                  seller: {
                    select: {
                      id: true,
                      shop_name: true,
                      logo_image: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  // 3. Validate cart items
  if (cart.items.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }
  // Check for unavailable items
  const unavailableItems = cart.items.filter((item) => item.unavailable);
  if (unavailableItems.length > 0) {
    const itemNames = unavailableItems.map((item) => item.variant.product.name);
    throw new HttpException(
      `Unavailable items in cart: ${itemNames.join(", ")}`,
      400,
    );
  }
  // Check stock for each item
  for (const item of cart.items) {
    const stockRecords =
      await MyGlobal.prisma.shopping_mall_inventory_records.aggregate({
        where: {
          variant_id: item.variant.id,
        },
        _sum: {
          quantity_change: true,
        },
      });
    const currentStock = stockRecords._sum.quantity_change ?? 0;
    if (currentStock < item.quantity) {
      throw new HttpException(
        `Insufficient stock for ${item.variant.product.name}. Available: ${currentStock}, Requested: ${item.quantity}`,
        400,
      );
    }
  }
  // 4. Calculate total price
  let totalPrice = 0;
  for (const item of cart.items) {
    const unitPrice = item.variant.price ?? item.variant.product.base_price;
    totalPrice += unitPrice * item.quantity;
  }
  // 5. Create order and related records in transaction
  const orderId = v4() as string & tags.Format<"uuid">;
  const orderNumber = v4();
  const now = new Date();
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create order
    const order = await tx.shopping_mall_orders.create({
      data: {
        id: orderId,
        order_number: orderNumber,
        total_price: totalPrice,
        status: "paid",
        shipping_recipient_name: address.recipient_name,
        shipping_phone_number: address.phone_number,
        shipping_street_address: address.street_address,
        shipping_city: address.city,
        shipping_state_province: address.state_province,
        shipping_postal_code: address.postal_code,
        shipping_country: address.country,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        customer: {
          connect: { id: props.customer.id },
        },
      },
      select: {
        id: true,
      },
    });
    // Create order items with snapshots and inventory records
    for (const item of cart.items) {
      const unitPrice = item.variant.price ?? item.variant.product.base_price;
      const orderItemId = v4();
      await tx.shopping_mall_order_items.create({
        data: {
          id: orderItemId,
          quantity: item.quantity,
          price: unitPrice,
          status: "paid",
          created_at: now,
          updated_at: now,
          deleted_at: null,
          order: { connect: { id: orderId } },
          product: { connect: { id: item.variant.product.id } },
          variant: { connect: { id: item.variant.id } },
          seller: { connect: { id: item.variant.product.seller.id } },
        },
      });
      // Create order item snapshot
      const snapshotId = v4();
      await tx.shopping_mall_order_item_snapshots.create({
        data: {
          id: snapshotId,
          product_name: item.variant.product.name,
          product_description: item.variant.product.description,
          price: unitPrice,
          seller_shop_name: item.variant.product.seller.shop_name,
          seller_logo_image: item.variant.product.seller.logo_image,
          created_at: now,
          orderItem: { connect: { id: orderItemId } },
        },
      });
      // Create variant option records
      const optionValues = JSON.parse(item.variant.option_values);
      for (const [optionKey, optionValue] of Object.entries(optionValues)) {
        await tx.shopping_mall_order_item_snapshot_variant_options.create({
          data: {
            id: v4(),
            option_key: optionKey,
            option_value: String(optionValue),
            created_at: now,
            snapshot: { connect: { id: snapshotId } },
          },
        });
      }
      // Create negative inventory record
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          variant_id: item.variant.id,
          order_id: orderId,
          quantity_change: -item.quantity,
          reason: "Order placed",
          created_at: now,
        },
      });
    }
    // Delete cart items
    await tx.shopping_mall_cart_items.deleteMany({
      where: {
        shopping_mall_cart_id: cart.id,
      },
    });
    return order;
  });
  // 6. Return complete order with all relations
  const fullOrder =
    await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
      where: { id: result.id },
      ...ShoppingMallOrderTransformer.select(),
    });
  return await ShoppingMallOrderTransformer.transform(fullOrder);
}
