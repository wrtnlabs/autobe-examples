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

export async function postShoppingMallCustomerCheckout(props: {
  customer: {
    id: string;
  };
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  // Step 1: Load cart with items, variants, products
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { shopping_mall_customer_id: props.customer.id },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: { seller: true },
              },
            },
          },
        },
      },
    },
  });
  if (!cart || cart.items.length === 0) {
    throw new HttpException("Cannot checkout with empty cart", 400);
  }
  // Step 2: Validate cart items - check unavailable flag
  const unavailableItems = cart.items.filter((item) => item.unavailable);
  if (unavailableItems.length > 0) {
    const itemNames = unavailableItems
      .map((i) => i.variant.product.name)
      .join(", ");
    throw new HttpException(
      `Cannot checkout: ${itemNames} are unavailable`,
      400,
    );
  }
  // Validate stock for each variant
  for (const item of cart.items) {
    const inventorySum =
      await MyGlobal.prisma.shopping_mall_inventory_records.aggregate({
        where: { variant_id: item.variant.id },
        _sum: { quantity_change: true },
      });
    const stock = inventorySum._sum.quantity_change ?? 0;
    if (stock < item.quantity) {
      throw new HttpException(
        `Insufficient stock for ${item.variant.product.name}: requested ${item.quantity}, available ${stock}`,
        400,
      );
    }
  }
  // Step 3: Validate address belongs to customer
  const address = await MyGlobal.prisma.shopping_mall_addresses.findFirst({
    where: {
      id: props.body.addressId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!address) {
    throw new HttpException("Invalid address selection", 404);
  }
  // Step 4-6: Create order in transaction
  const orderId = v4();
  const orderNumber = v4();
  const now = new Date();
  // Calculate total price
  const totalPrice = cart.items.reduce((sum, item) => {
    const price = item.variant.price ?? item.variant.product.base_price;
    return sum + price * item.quantity;
  }, 0);
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Re-validate stock inside transaction for race condition safety
    for (const item of cart.items) {
      const inventorySum = await tx.shopping_mall_inventory_records.aggregate({
        where: { variant_id: item.variant.id },
        _sum: { quantity_change: true },
      });
      const stock = inventorySum._sum.quantity_change ?? 0;
      if (stock < item.quantity) {
        throw new HttpException(
          `Insufficient stock for ${item.variant.product.name}: requested ${item.quantity}, available ${stock}`,
          400,
        );
      }
    }
    // Create order
    await tx.shopping_mall_orders.create({
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
    });
    // Create order items, snapshots, and inventory records
    for (const item of cart.items) {
      const orderItemId = v4();
      const price = item.variant.price ?? item.variant.product.base_price;
      // Create order item
      await tx.shopping_mall_order_items.create({
        data: {
          id: orderItemId,
          shopping_mall_order_id: orderId,
          shopping_mall_product_id:
            item.shopping_mall_product_variant_id.replace("variant", "product"),
          shopping_mall_product_variant_id:
            item.shopping_mall_product_variant_id,
          shopping_mall_seller_id: item.variant.product.shopping_mall_seller_id,
          shopping_mall_shipment_id: null,
          quantity: item.quantity,
          price: price,
          status: "paid",
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
      // Create order item snapshot
      const snapshotId = v4();
      await tx.shopping_mall_order_item_snapshots.create({
        data: {
          id: snapshotId,
          order_item_id: orderItemId,
          product_name: item.variant.product.name,
          product_description: item.variant.product.description,
          price: price,
          seller_shop_name: item.variant.product.seller.shop_name,
          seller_logo_image: item.variant.product.seller.logo_image,
          created_at: now,
        },
      });
      // Create variant options
      const optionValues: Record<string, string> = JSON.parse(
        item.variant.option_values,
      );
      for (const [key, value] of Object.entries(optionValues)) {
        await tx.shopping_mall_order_item_snapshot_variant_options.create({
          data: {
            id: v4(),
            order_item_snapshot_id: snapshotId,
            option_key: key,
            option_value: value,
            created_at: now,
          },
        });
      }
      // Decrease inventory
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
    // Clear cart items
    await tx.shopping_mall_cart_items.deleteMany({
      where: { shopping_mall_cart_id: cart.id },
    });
  });
  // Step 7: Return order using transformer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: orderId },
    ...ShoppingMallOrderTransformer.select(),
  });
  return await ShoppingMallOrderTransformer.transform(order);
}
