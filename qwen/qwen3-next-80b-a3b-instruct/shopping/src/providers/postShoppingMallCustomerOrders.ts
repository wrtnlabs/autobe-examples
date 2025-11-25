import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  // Find active cart for customer
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      shopping_mall_customer_id: props.customer.id,
      status: "active",
      deleted_at: null,
    },
  });

  if (!cart) {
    throw new HttpException("No active cart found", 404);
  }

  // Fetch all cart items and their variants
  const cartItems = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: {
      shopping_mall_cart_id: cart.id,
      status: "active",
      deleted_at: null,
    },
    include: {
      productVariant: {
        include: {
          product: true,
        },
      },
    },
  });

  if (cartItems.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }

  // Validate inventory and calculate subtotal
  let subtotal = 0;
  for (const cartItem of cartItems) {
    if (cartItem.productVariant.inventory_count < cartItem.quantity) {
      throw new HttpException(
        "Insufficient inventory for product variant: " +
          cartItem.productVariant.id,
        400,
      );
    }
    subtotal += cartItem.price * cartItem.quantity;
  }

  // Calculate tax (example: 10% based on product category, simplified)
  // In practice, this would require joining with product's tax_category
  const tax_amount = 0.1 * subtotal;

  // Validate shipping method if provided
  let shippingMethodId = props.body.shippingMethod_id;
  if (shippingMethodId !== undefined) {
    const shippingMethod =
      await MyGlobal.prisma.shopping_mall_shipping_methods.findUnique({
        where: { id: shippingMethodId },
      });
    if (!shippingMethod) {
      throw new HttpException("Invalid shipping method ID", 400);
    }
  }

  // Validate payment method if provided
  let paymentMethodId = props.body.paymentMethod_id;
  if (paymentMethodId !== undefined) {
    const paymentMethod =
      await MyGlobal.prisma.shopping_mall_payment_methods.findUnique({
        where: { id: paymentMethodId },
      });
    if (!paymentMethod) {
      throw new HttpException("Invalid payment method ID", 400);
    }
  }

  // Use first cart item to determine primary seller
  const firstVariant = cartItems[0].productVariant;
  const product = firstVariant.product;
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // Generate unique order number atomically
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
  const orderNumber = `ORD-${dateStr}-${Math.floor(Math.random() * 9000) + 1000}`;

  // Create order
  const order = await MyGlobal.prisma.shopping_mall_orders.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      order_number: orderNumber,
      subtotal,
      tax_amount: tax_amount > 0 ? tax_amount : 0,
      shipping_fee: shippingMethodId
        ? cartItems[0].productVariant.product.price * 0.1
        : 0,
      discount_amount: 0,
      total_amount:
        subtotal +
        (tax_amount || 0) +
        (shippingMethodId
          ? cartItems[0].productVariant.product.price * 0.1
          : 0),
      currency: "KRW",
      status: "draft",
      business_status: "normal",
      notes: props.body.notes ?? null,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
      deleted_at: null,
      shopping_mall_customer_id: props.customer.id,
      shopping_mall_seller_id: product.shopping_mall_seller_id,
      shopping_mall_payment_method_id: paymentMethodId ?? null,
      shopping_mall_shipping_method_id: shippingMethodId ?? null,
    },
  });

  // Create order items from cart items
  await MyGlobal.prisma.shopping_mall_order_items.createMany({
    data: cartItems.map((item) => ({
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: order.id,
      shopping_mall_product_variant_id: item.shopping_mall_product_variant_id,
      quantity: item.quantity,
      unit_price: item.price,
      item_total: item.price * item.quantity,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    })),
  });

  // Reserve inventory: reduce variant count
  await Promise.all(
    cartItems.map((item) =>
      MyGlobal.prisma.shopping_mall_product_variants.update({
        where: { id: item.shopping_mall_product_variant_id },
        data: {
          inventory_count: {
            decrement: item.quantity,
          },
        },
      }),
    ),
  );

  // Mark cart items as checked_out and cart as checked_out
  await MyGlobal.prisma.shopping_mall_cart_items.updateMany({
    where: { shopping_mall_cart_id: cart.id },
    data: { status: "checked_out", updated_at: toISOStringSafe(now) },
  });

  await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: cart.id },
    data: { status: "checked_out", updated_at: toISOStringSafe(now) },
  });

  // Fetch customer summary (ISummary returns object)
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customer.id, deleted_at: null },
  });

  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }

  // Fetch seller summary (ISummary is type string)
  const sellerId = product.shopping_mall_seller_id;

  // Get payment method summary if assigned
  let paymentMethod: IShoppingMallPaymentMethod.ISummary | undefined =
    undefined;
  if (paymentMethodId) {
    const pMethod =
      await MyGlobal.prisma.shopping_mall_payment_methods.findUnique({
        where: { id: paymentMethodId },
      });
    if (pMethod) {
      paymentMethod = pMethod.id;
    }
  }

  // Get shipping method summary if assigned
  let shippingMethod: IShoppingMallShippingMethod.ISummary | undefined =
    undefined;
  if (shippingMethodId) {
    const sMethod =
      await MyGlobal.prisma.shopping_mall_shipping_methods.findUnique({
        where: { id: shippingMethodId },
      });
    if (sMethod) {
      const serviceLevel: IShoppingMallShippingMethod.ISummary["serviceLevel"] =
        (sMethod.code as "priority" | "standard" | "expedited" | "overnight") ??
        "standard";

      shippingMethod = {
        id: sMethod.id,
        name: sMethod.name,
        description:
          sMethod.description !== null
            ? (sMethod.description satisfies string as string)
            : undefined,
        cost: sMethod.base_cost,
        estimatedDeliveryDays: sMethod.estimated_days_min,
        carrier: sMethod.code,
        serviceLevel,
        maxWeight: sMethod.base_cost,
      };
    }
  }

  return {
    id: order.id,
    order_number: order.order_number,
    subtotal: order.subtotal,
    tax_amount: order.tax_amount,
    shipping_fee: order.shipping_fee,
    discount_amount: order.discount_amount,
    total_amount: order.total_amount,
    currency: order.currency,
    status: order.status,
    business_status: order.business_status,
    notes:
      order.notes !== null
        ? (order.notes satisfies string as string)
        : undefined,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at:
      order.deleted_at !== null ? toISOStringSafe(order.deleted_at) : undefined,
    customer: {
      id: customer.id,
      email: customer.email,
      name: customer.first_name + " " + customer.last_name,
      created_at: toISOStringSafe(customer.created_at),
      status: customer.status,
    },
    seller: sellerId,
    paymentMethod: paymentMethod,
    shippingMethod: shippingMethod,
  };
}
