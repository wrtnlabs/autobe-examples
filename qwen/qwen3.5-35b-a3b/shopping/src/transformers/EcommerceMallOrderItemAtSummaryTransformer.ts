import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
    const cancellationRequests = input.cancellationRequests || [];
    const refundRequests = input.refundRequests || [];
    // Compute status based on cancellation and refund states
    let status:
      | "paid"
      | "shipped"
      | "delivered"
      | "cancelled"
      | "refunded"
      | "partially_completed";
    const hasAnyCancellation = cancellationRequests.length > 0;
    const allCancelled =
      hasAnyCancellation &&
      cancellationRequests.every((r) => r.status === "cancelled");
    const hasAnyRefund = refundRequests.length > 0;
    const allRefunded =
      hasAnyRefund && refundRequests.every((r) => r.status === "approved");
    if (allCancelled) {
      status = "cancelled";
    } else if (allRefunded) {
      status = "refunded";
    } else if (hasAnyCancellation && !allCancelled) {
      status = "partially_completed";
    } else if (hasAnyRefund && !allRefunded) {
      status = "partially_completed";
    } else {
      // Check if order is delivered or shipped based on parent order status
      const orderStatus = input.order.status;
      if (orderStatus === "delivered") {
        status = "delivered";
      } else if (orderStatus === "shipped") {
        status = "shipped";
      } else {
        status = "paid";
      }
    }
    return {
      id: input.id,
      productName: input.product_name,
      productSku: input.product_sku,
      variantName: input.variant_name,
      quantity: input.quantity,
      unitPrice: Number(input.unit_price),
      totalPrice: Number(input.total_price),
      status,
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
