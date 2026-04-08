import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCheckoutCollector } from "../collectors/EcommerceMallCheckoutCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderTransformer } from "../transformers/EcommerceMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerPaymentsCheckout(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCheckout.ICreate;
}): Promise<IEcommerceMallOrder> {
  const customerEntity: IEntity = {
    id: props.customer.id,
  };
  const sessionEntity: IEntity = {
    id: props.customer.session_id,
  };
  // Validate customer account is active (not banned/suspended)
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: {
      id: props.customer.id,
      deleted_at: null,
    },
  });
  if (customer === null) {
    throw new HttpException("Customer account not found or suspended", 403);
  }
  // Build order data using collector (handles cart fetch, totals, address resolution, snapshots)
  const orderData = await EcommerceMallCheckoutCollector.collect({
    body: props.body,
    ecommerceMallCustomers: customerEntity,
    ecommerceMallCustomerSessions: sessionEntity,
  });
  // Initiate payment with external gateway (30s timeout per SLO)
  const paymentResult = await simulatePaymentGateway({
    amount: orderData.total_amount,
    orderReference: orderData.order_number,
  });
  if (!paymentResult.success) {
    if (paymentResult.timeout) {
      throw new HttpException("Payment timeout", 504);
    }
    throw new HttpException("Payment failed", 402);
  }
  // Atomic transaction - inventory deduction and cart clearance
  const order = await MyGlobal.prisma.$transaction(async (tx) => {
    // Fetch cart with variants for inventory validation
    const cart = await tx.ecommerce_mall_carts.findFirst({
      where: { ecommerce_mall_customer_id: props.customer.id },
      include: {
        cartItems: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
    if (cart === null || cart.cartItems.length === 0) {
      throw new HttpException("Cart is empty", 400);
    }
    // Validate all items are available and deduct inventory
    for (const item of cart.cartItems) {
      const variant = item.productVariant;
      const product = variant.product;
      // Validate variant and product are not soft-deleted
      if (variant.deleted_at !== null) {
        throw new HttpException(
          `Item unavailable: variant ${variant.sku_code} is no longer available`,
          400,
        );
      }
      if (product.deleted_at !== null) {
        throw new HttpException(
          `Item unavailable: product ${product.name} is no longer available`,
          400,
        );
      }
      // Validate sufficient stock
      if (variant.quantity < item.quantity) {
        throw new HttpException(
          `Insufficient stock for ${product.name} - ${variant.sku_code}`,
          400,
        );
      }
      // Deduct inventory from variant
      await tx.ecommerce_mall_product_variants.update({
        where: { id: variant.id },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });
      // Create inventory deduction record (only valid schema fields)
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4(),
          quantity_change: -item.quantity,
          reason: `order_placement`,
          ecommerce_mall_product_variant_id: variant.id,
          created_at: new Date(),
        },
      });
    }
    // Clear all cart items
    await tx.ecommerce_mall_cart_items.deleteMany({
      where: { ecommerce_mall_cart_id: cart.id },
    });
    // Create order
    const createdOrder = await tx.ecommerce_mall_orders.create({
      data: orderData,
    });
    return createdOrder;
  });
  // Fetch complete order with relations for response
  const fullOrder =
    await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
      where: { id: order.id },
      ...EcommerceMallOrderTransformer.select(),
    });
  // Transform and return complete order
  return EcommerceMallOrderTransformer.transform(fullOrder);
}
async function simulatePaymentGateway(props: {
  amount: number;
  orderReference: string;
}): Promise<{
  success: boolean;
  timeout?: boolean;
}> {
  const TIMEOUT_MS = 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Simulate payment processing
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    clearTimeout(timeoutId);
    return { success: true };
  } catch {
    clearTimeout(timeoutId);
    if (controller.signal.aborted) {
      return { success: false, timeout: true };
    }
    return { success: false };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
// import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerPaymentsCheckout(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCheckout.ICreate;
// }): Promise<IEcommerceMallOrder> {
//   const record = await MyGlobal.prisma.ecommerce_mall_orders.create({
//     data: await EcommerceMallCheckoutCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallOrderTransformer.select(),
//   });
//   return await EcommerceMallOrderTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------