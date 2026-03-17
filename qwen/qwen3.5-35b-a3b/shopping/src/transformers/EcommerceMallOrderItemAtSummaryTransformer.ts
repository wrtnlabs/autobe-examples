import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";

export namespace EcommerceMallOrderItemAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        product_name: true,
        product_sku: true,
        variant_name: true,
        quantity: true,
        unit_price: true,
        total_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: EcommerceMallOrderAtSummaryTransformer.select(),
        productSnapshot: true,
        variantSnapshot: true,
        sellerSnapshot: true,
        snapshots: true,
        shipmentItems: true,
        cancellationRequests: true,
        refundRequests: true,
      },
    } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItem.ISummary> {
    // Compute status based on cancellation and refund requests
    const hasAllCancelled =
      input.cancellationRequests.length > 0 &&
      input.cancellationRequests.every((cr) => cr.status === "approved");
    const hasAllRefunded =
      input.refundRequests.length > 0 &&
      input.refundRequests.every((rr) => rr.status === "approved");
    const hasAnyCancelled = input.cancellationRequests.some(
      (cr) => cr.status === "approved",
    );
    const hasAnyRefunded = input.refundRequests.some(
      (rr) => rr.status === "approved",
    );
    let status:
      | "paid"
      | "shipped"
      | "delivered"
      | "cancelled"
      | "refunded"
      | "partially_completed";
    if (hasAllCancelled) {
      status = "cancelled";
    } else if (hasAllRefunded) {
      status = "refunded";
    } else if (hasAnyCancelled || hasAnyRefunded) {
      status = "partially_completed";
    } else if (input.order.status === "delivered") {
      status = "delivered";
    } else if (input.order.status === "shipped") {
      status = "shipped";
    } else {
      status = "paid";
    }
    return {
      id: input.id,
      productName: input.product_name,
      productSku: input.product_sku,
      variantName: input.variant_name,
      quantity: input.quantity,
      unitPrice: input.unit_price,
      totalPrice: input.total_price,
      status: status,
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
