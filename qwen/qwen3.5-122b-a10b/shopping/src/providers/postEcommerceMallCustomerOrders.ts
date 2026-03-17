import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderTransformer } from "../transformers/EcommerceMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IEcommerceMallOrder.ICreate;
}): Promise<IEcommerceMallOrder> {
  // 1. Validate customer account status
  const customer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id, deleted_at: null },
      select: { id: true, account_status: true },
    });
  if (customer.account_status !== "active") {
    throw new HttpException("Account is not active", 403);
  }
  // 2. Retrieve customer's cart items with product variant details
  const cartItems = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: {
      customer_id: props.customer.id,
      deleted_at: null,
    },
    include: {
      productVariant: {
        select: {
          id: true,
          sku_code: true,
          price: true,
          stock_quantity: true,
          product: {
            select: { base_price: true },
          },
          variantOptions: {
            select: { key: true, value: true },
          },
        },
      },
    },
  });
  if (cartItems.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }
  // 3. Validate cart items and calculate total price
  let totalPrice = 0;
  for (const cartItem of cartItems) {
    if (cartItem.is_available === false) {
      throw new HttpException(
        `Product variant ${cartItem.productVariant.sku_code} is not available`,
        400,
      );
    }
    if (cartItem.productVariant.stock_quantity < cartItem.quantity) {
      throw new HttpException(
        `Insufficient stock for product variant ${cartItem.productVariant.sku_code}. Required: ${cartItem.quantity}, Available: ${cartItem.productVariant.stock_quantity}`,
        400,
      );
    }
    const variantPrice =
      cartItem.productVariant.price ??
      cartItem.productVariant.product.base_price;
    totalPrice += variantPrice * cartItem.quantity;
  }
  // 4. Validate shipping address
  let shippingAddress: {
    recipient_name: string;
    phone_number: string;
    street_address: string;
    city: string;
    state_province: string;
    postal_code: string;
    country: string;
  };
  if (props.body.address_id) {
    const savedAddress =
      await MyGlobal.prisma.ecommerce_mall_addresses.findUnique({
        where: {
          id: props.body.address_id,
          ecommerce_mall_customer_id: props.customer.id,
          deleted_at: null,
        },
      });
    if (!savedAddress) {
      throw new HttpException("Address not found", 404);
    }
    shippingAddress = {
      recipient_name: savedAddress.recipient_name,
      phone_number: savedAddress.phone_number,
      street_address: savedAddress.street_address,
      city: savedAddress.city,
      state_province: savedAddress.state_province,
      postal_code: savedAddress.postal_code,
      country: savedAddress.country,
    };
  } else {
    shippingAddress = {
      recipient_name: props.body.shipping_recipient_name,
      phone_number: props.body.shipping_phone_number,
      street_address: props.body.shipping_street_address,
      city: props.body.shipping_city,
      state_province: props.body.shipping_state,
      postal_code: props.body.shipping_postal_code,
      country: props.body.shipping_country,
    };
  }
  // 5. Begin transaction and create order
  const now = new Date();
  const orderNumber = `ORD-${now.getTime().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const createdOrder = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create order record
    const order = await tx.ecommerce_mall_orders.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        order_number: orderNumber,
        ecommerce_mall_customer_id: props.customer.id,
        shipping_recipient_name: shippingAddress.recipient_name,
        shipping_phone_number: shippingAddress.phone_number,
        shipping_street_address: shippingAddress.street_address,
        shipping_city: shippingAddress.city,
        shipping_state: shippingAddress.state_province,
        shipping_postal_code: shippingAddress.postal_code,
        shipping_country: shippingAddress.country,
        total_price: totalPrice,
        status: "paid",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    // Create order items and inventory records
    await Promise.all(
      cartItems.map(async (cartItem) => {
        const variantPrice =
          cartItem.productVariant.price ??
          cartItem.productVariant.product.base_price;
        // Create order item
        await tx.ecommerce_mall_order_items.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            ecommerce_mall_order_id: order.id,
            ecommerce_mall_product_variant_id: cartItem.productVariant.id,
            quantity: cartItem.quantity,
            unit_price: variantPrice,
            status: "paid",
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        });
        // Create inventory record
        const inventoryRecords =
          await tx.ecommerce_mall_inventory_records.findMany({
            where: {
              ecommerce_mall_product_variant_id: cartItem.productVariant.id,
              deleted_at: null,
            },
            select: { quantity_change: true },
          });
        const currentStock =
          inventoryRecords.reduce((sum, r) => sum + r.quantity_change, 0) -
          cartItem.quantity;
        await tx.ecommerce_mall_inventory_records.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            ecommerce_mall_product_variant_id: cartItem.productVariant.id,
            quantity_change: -cartItem.quantity,
            reason: "order_placed",
            recorded_at: now,
            current_stock: currentStock,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        });
      }),
    );
    // Delete cart items
    await tx.ecommerce_mall_cart_items.deleteMany({
      where: {
        id: {
          in: cartItems.map((item) => item.id),
        },
      },
    });
    return order;
  });
  // 6. Return created order with order items using transformer
  const orderWithItems =
    await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
      where: { id: createdOrder.id },
      ...EcommerceMallOrderTransformer.select(),
    });
  return await EcommerceMallOrderTransformer.transform(orderWithItems);
}
