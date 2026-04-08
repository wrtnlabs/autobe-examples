import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { EcommerceMallOrderItemCollector } from "./EcommerceMallOrderItemCollector";

export namespace EcommerceMallOrderCollector {
  export async function collect(props: {
    body: IEcommerceMallOrder.ICreate;
    ecommerceMallMembers: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    // Generate order number (format: ORD-YYYYMMDD-XXXXXX)
    const orderNumber: string = `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(
      Math.random() * 1000000,
    )
      .toString()
      .padStart(6, "0")}`;
    // Calculate total price from order_items using neighbor collector
    const rawCollectedItems = await ArrayUtil.asyncMap(
      props.body.order_items,
      (item, i) =>
        EcommerceMallOrderItemCollector.collect({
          body: item,
          order: { id },
        }),
    );
    const collectedItems = rawCollectedItems.map((item, i) => ({
      ...item,
      unit_price: item.unit_price ?? 0,
      subtotal: item.subtotal ?? 0,
      cancellationRequestItem: undefined,
      refundRequestItem: undefined,
      customerReviews: undefined,
      shipmentItems: undefined,
      reviews: undefined,
      reviewSnapshots: undefined,
      ecommerceMallOrderItemSnapshotss: undefined,
      snapshots: undefined,
    }));
    const totalPrice: number = collectedItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    return {
      id,
      order_number: orderNumber,
      status: "paid",
      total_price: totalPrice,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.ecommerceMallMembers.id } },
      shippingAddress: { connect: { id: props.body.shipping_address_id } },
      customerReviews: undefined,
      snapshots: undefined,
      items: collectedItems.length ? { create: collectedItems } : undefined,
      cancellationRequests: undefined,
    } satisfies Prisma.ecommerce_mall_ordersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallOrderCollector {
//         export async function collect(props: {
//           body: IEcommerceMallOrder.ICreate;
//           ecommerceMallMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       order_number: ...,
//       status: ...,
//       total_price: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       member: ...,
//       shippingAddress: ...,
//       customerReviews: ...,
//       snapshots: ...,
//       items: ...,
//       cancellationRequests: ...,
//           } satisfies Prisma.ecommerce_mall_ordersCreateInput;
//         }
//       }
//--------------------------------------------------------------