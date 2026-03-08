import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
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

export async function postShoppingMallCustomerCheckout(props: {
  customer: {
    id: string;
  };
  body: IShoppingMallCheckout.ICreate;
}): Promise<IShoppingMallOrder> {
  // Step 1: Fetch customer's cart with items
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { shopping_mall_customer_id: props.customer.id },
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
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  base_price: true,
                  shopping_mall_seller_id: true,
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
  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }
  // Step 2: Validate cart is not empty
  if (cart.items.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }
  // Step 3: Check for unavailable items
  const unavailableItems = cart.items.filter((item) => item.unavailable);
  if (unavailableItems.length > 0) {
    throw new HttpException(
      `Some items are unavailable: ${unavailableItems.length} items`,
      400,
    );
  }
  // Step 4: Resolve shipping address
  let address;
  if (props.body.address_id) {
    address = await MyGlobal.prisma.shopping_mall_addresses.findFirst({
      where: {
        id: props.body.address_id,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
    if (!address) {
      throw new HttpException(
        "Address not found or does not belong to customer",
        400,
      );
    }
  } else {
    address = await MyGlobal.prisma.shopping_mall_addresses.findFirst({
      where: {
        shopping_mall_customer_id: props.customer.id,
        is_default: true,
        deleted_at: null,
      },
    });
    if (!address) {
      throw new HttpException("No default address found", 400);
    }
  }
  // Step 5: Verify stock for all items
  const stockChecks = await Promise.all(
    cart.items.map(async (item) => {
      const records =
        await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
          where: { variant_id: item.variant.id },
          select: { quantity_change: true },
        });
      const currentStock = records.reduce(
        (sum, r) => sum + r.quantity_change,
        0,
      );
      return {
        item,
        currentStock,
        sufficient: item.quantity <= currentStock,
      };
    }),
  );
  const insufficientStock = stockChecks.filter((check) => !check.sufficient);
  if (insufficientStock.length > 0) {
    const details = insufficientStock
      .map(
        (check) =>
          `Item requires ${check.item.quantity} but only ${check.currentStock} available`,
      )
      .join("; ");
    throw new HttpException(`Insufficient stock: ${details}`, 400);
  }
  // Step 6: Calculate total price
  const totalPrice = cart.items.reduce((sum, item) => {
    const price = item.variant.price ?? item.variant.product.base_price;
    return sum + item.quantity * price;
  }, 0);
  // Step 7: Generate order number
  const orderNumber = `ORD-${Date.now()}-${v4().slice(0, 8)}`;
  // Step 8: Create order in transaction
  const orderId = v4();
  const now = new Date();
  const order = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create order
    const newOrder = await tx.shopping_mall_orders.create({
      data: {
        id: orderId,
        shopping_mall_customer_id: props.customer.id,
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
      },
      ...ShoppingMallOrderTransformer.select(),
    });
    // Create order items and snapshots
    for (const cartItem of cart.items) {
      const orderItemId = v4();
      const snapshotId = v4();
      const price =
        cartItem.variant.price ?? cartItem.variant.product.base_price;
      const product = cartItem.variant.product;
      // Create order item
      await tx.shopping_mall_order_items.create({
        data: {
          id: orderItemId,
          shopping_mall_order_id: orderId,
          shopping_mall_product_id: product.id,
          shopping_mall_product_variant_id: cartItem.variant.id,
          shopping_mall_seller_id: product.shopping_mall_seller_id,
          shopping_mall_shipment_id: null,
          quantity: cartItem.quantity,
          price: price,
          status: "paid",
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
      // Create order item snapshot
      await tx.shopping_mall_order_item_snapshots.create({
        data: {
          id: snapshotId,
          order_item_id: orderItemId,
          product_name: product.name,
          product_description: product.description,
          price: price,
          seller_shop_name: product.seller.shop_name,
          seller_logo_image: product.seller.logo_image,
          created_at: now,
        },
      });
      // Create variant option records
      const variantOptions = JSON.parse(cartItem.variant.option_values);
      for (const [key, value] of Object.entries(variantOptions)) {
        await tx.shopping_mall_order_item_snapshot_variant_options.create({
          data: {
            id: v4(),
            order_item_snapshot_id: snapshotId,
            option_key: key,
            option_value: String(value),
            created_at: now,
          },
        });
      }
      // Create inventory record
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          variant_id: cartItem.variant.id,
          order_id: orderId,
          cancellation_request_id: null,
          refund_request_id: null,
          seller_id: null,
          quantity_change: -cartItem.quantity,
          reason: "Order placed",
          created_at: now,
        },
      });
      // Delete cart item
      await tx.shopping_mall_cart_items.delete({
        where: { id: cartItem.id },
      });
    }
    // Update cart's updated_at
    await tx.shopping_mall_carts.update({
      where: { id: cart.id },
      data: { updated_at: now },
    });
    return newOrder;
  });
  return await ShoppingMallOrderTransformer.transform(order);
}
