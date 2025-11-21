import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  // Validate customer session exists and is active
  const customerSession =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: {
        id: props.customer.session_id,
        shopping_mall_customer_id: props.customer.id,
        expired_at: null,
      },
    });

  if (!customerSession) {
    throw new HttpException("Invalid or expired customer session", 401);
  }

  // Validate all product variants exist and have sufficient inventory
  const productVariantIds = props.body.items.map(
    (item) => item.shopping_mall_product_variant_id,
  );
  const productVariants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        id: { in: productVariantIds },
        active: true,
        deleted_at: null,
      },
      include: {
        product: {
          include: {
            seller: true,
          },
        },
      },
    });

  if (productVariants.length !== productVariantIds.length) {
    throw new HttpException(
      "One or more product variants are unavailable",
      400,
    );
  }

  // Check inventory availability and product status
  for (const item of props.body.items) {
    const variant = productVariants.find(
      (v) => v.id === item.shopping_mall_product_variant_id,
    );
    if (!variant) {
      throw new HttpException(
        `Product variant ${item.shopping_mall_product_variant_id} not found`,
        400,
      );
    }
    if (variant.stock_quantity < item.quantity) {
      throw new HttpException(
        `Insufficient inventory for product variant ${variant.variant_name}`,
        400,
      );
    }
    if (!variant.product.status || variant.product.deleted_at) {
      throw new HttpException(
        `Product ${variant.product.name} is not available`,
        400,
      );
    }
    if (!variant.product.seller || variant.product.seller.status !== "active") {
      throw new HttpException(
        `Seller for product ${variant.product.name} is not active`,
        400,
      );
    }
  }

  // Calculate order totals
  let subtotal = 0;
  const orderItemsData: any[] = [];
  const currentTimestamp = toISOStringSafe(new Date());

  for (const item of props.body.items) {
    const variant = productVariants.find(
      (v) => v.id === item.shopping_mall_product_variant_id,
    );
    if (!variant) continue;

    const unitPrice = variant.price ?? 0;
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;

    orderItemsData.push({
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: "", // Will be set after order creation
      shopping_mall_product_variant_id: item.shopping_mall_product_variant_id,
      shopping_mall_seller_id: variant.product.shopping_mall_seller_id,
      quantity: item.quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      product_name: variant.product.name,
      product_attributes: variant.attributes,
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
    });
  }

  // Calculate tax and shipping (simplified for now)
  const taxAmount = subtotal * 0.1; // 10% tax
  const shippingAmount = 10; // Fixed shipping
  const totalAmount = subtotal + taxAmount + shippingAmount;

  // Generate order number using timestamp
  const timestamp = new Date();
  const orderNumber = `ORD-${timestamp.getFullYear()}${String(timestamp.getMonth() + 1).padStart(2, "0")}${String(timestamp.getDate()).padStart(2, "0")}-${Math.floor(
    Math.random() * 10000,
  )
    .toString()
    .padStart(4, "0")}`;

  // Create order and order items in transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create order
    const order = await tx.shopping_mall_orders.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        order_number: orderNumber,
        total_amount: totalAmount,
        subtotal_amount: subtotal,
        tax_amount: taxAmount,
        shipping_amount: shippingAmount,
        currency: props.body.currency,
        status: "pending",
        shipping_address: props.body.shipping_address,
        billing_address: props.body.billing_address,
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_customer_session_id: props.customer.session_id,
        created_at: currentTimestamp,
        updated_at: currentTimestamp,
      },
      include: {
        customer: true,
        customerSession: true,
      },
    });

    // Create order items
    const orderItemsWithOrderId = orderItemsData.map((item) => ({
      ...item,
      shopping_mall_order_id: order.id,
    }));

    await tx.shopping_mall_order_items.createMany({
      data: orderItemsWithOrderId,
    });

    // Update inventory
    for (const item of props.body.items) {
      const variant = productVariants.find(
        (v) => v.id === item.shopping_mall_product_variant_id,
      );
      if (variant) {
        await tx.shopping_mall_product_variants.update({
          where: { id: variant.id },
          data: {
            stock_quantity: variant.stock_quantity - item.quantity,
            updated_at: currentTimestamp,
          },
        });
      }
    }

    return order;
  });

  // Fetch complete order with items and relationships
  const completeOrder = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: result.id },
    include: {
      customer: true,
      customerSession: true,
      shopping_mall_order_items: {
        include: {
          productVariant: {
            include: {
              product: {
                include: {
                  seller: true,
                },
              },
            },
          },
          seller: true,
        },
      },
    },
  });

  if (!completeOrder) {
    throw new HttpException("Order creation failed", 500);
  }

  // Fetch customer and customer session separately since relations don't exist
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: completeOrder.shopping_mall_customer_id },
  });

  const customerSessionData =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findUnique({
      where: { id: completeOrder.shopping_mall_customer_session_id },
    });

  if (!customer || !customerSessionData) {
    throw new HttpException("Order creation failed", 500);
  }

  // Transform to API response format
  return {
    id: completeOrder.id,
    order_number: completeOrder.order_number,
    total_amount: completeOrder.total_amount,
    subtotal_amount: completeOrder.subtotal_amount,
    tax_amount: completeOrder.tax_amount,
    shipping_amount: completeOrder.shipping_amount,
    currency: completeOrder.currency,
    status: completeOrder.status,
    shipping_address: completeOrder.shipping_address,
    billing_address: completeOrder.billing_address,
    created_at: toISOStringSafe(completeOrder.created_at),
    updated_at: toISOStringSafe(completeOrder.updated_at),
    deleted_at: completeOrder.deleted_at
      ? toISOStringSafe(completeOrder.deleted_at)
      : undefined,
    customer: {
      id: customer.id,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone_number: customer.phone_number ?? undefined,
      status: customer.status,
      created_at: toISOStringSafe(customer.created_at),
      updated_at: customer.updated_at
        ? toISOStringSafe(customer.updated_at)
        : undefined,
    },
    customerSession: {
      id: customerSessionData.id,
      created_at: toISOStringSafe(customerSessionData.created_at),
    },
  };
}
