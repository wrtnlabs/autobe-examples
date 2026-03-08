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
        item_status: true,
        quantity: true,
        unit_price: true,
        product_snapshot: true,
        variant_snapshot: true,
        seller_profile_snapshot: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: EcommerceMallOrderAtSummaryTransformer.select(),
        product: true,
        productVariant: true,
        statusSnapshots: true,
        shipmentItem: true,
        cancellationRequests: true,
        refundRequests: true,
      },
    } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItem.ISummary> {
    return {
      id: input.id,
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      quantity: input.quantity,
      unitPrice: Number(input.unit_price),
      itemStatus: typia.assert<
        "shipped" | "delivered" | "cancelled" | "paid" | "refunded"
      >(input.item_status),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      productSnapshot: input.product_snapshot,
      variantSnapshot: input.variant_snapshot,
      sellerProfileSnapshot: input.seller_profile_snapshot,
    };
  }
}
