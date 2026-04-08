import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallOrderCollector {
  export async function collect(props: {
    body: IEcommerceMallOrder.ICreate;
    customer: IEntity;
    subtotal: number;
    shippingCost: number;
    totalAmount: number;
    orderItems: Array<{
      productSnapshotId: string;
      sellerProfileSnapshotId: string;
      productVariantId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    // Generate unique order number: ORD-{timestamp}-{random}
    const timestamp = now.getTime();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber: string = `ORD-${timestamp}-${randomPart}`;
    return {
      // Scalar fields
      id,
      order_number: orderNumber,
      subtotal: props.subtotal,
      shipping_cost: props.shippingCost,
      total_amount: props.totalAmount,
      status: "paid",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      // BelongsTo relations (use relation name, NOT FK column name)
      customer: { connect: { id: props.customer.id } },
      shippingAddress: { connect: { id: props.body.shippingAddressId } },
      // HasMany relations - order items
      orderItems: {
        create: props.orderItems.map((item) => ({
          id: v4(),
          product: { connect: { id: item.productSnapshotId } },
          productSnapshot: { connect: { id: item.productSnapshotId } },
          sellerProfileSnapshot: {
            connect: { id: item.sellerProfileSnapshotId },
          },
          productVariant: { connect: { id: item.productVariantId } },
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          status: "active",
          created_at: now,
          updated_at: now,
        })),
      },
      // Omit shipments - created separately by seller
    } satisfies Prisma.ecommerce_mall_ordersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallOrderCollector {
//         export async function collect(props: {
//           body: IEcommerceMallOrder.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       order_number: ...,
//       subtotal: ...,
//       shipping_cost: ...,
//       total_amount: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//       shippingAddress: ...,
//       orderItems: ...,
//       shipments: ...,
//           } satisfies Prisma.ecommerce_mall_ordersCreateInput;
//         }
//       }
//--------------------------------------------------------------