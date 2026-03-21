import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";
import { EcommerceMallProductSnapshotAtSummaryTransformer } from "./EcommerceMallProductSnapshotAtSummaryTransformer";
import { EcommerceMallSellerProfileSnapshotAtSummaryTransformer } from "./EcommerceMallSellerProfileSnapshotAtSummaryTransformer";

export namespace EcommerceMallOrderItemAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        unit_price: true,
        status: true,
        created_at: true,
        updated_at: true,
        order: EcommerceMallOrderAtSummaryTransformer.select(),
        product: { select: { id: true } },
        productVariant: { select: { id: true } },
        productSnapshot:
          EcommerceMallProductSnapshotAtSummaryTransformer.select(),
        sellerProfileSnapshot:
          EcommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
        shipmentItem: { select: { id: true } },
        cancellationRequests: { select: { id: true } },
        refundRequests: { select: { id: true } },
        reviews: { select: { id: true } },
      },
    } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItem.ISummary> {
    return {
      id: input.id,
      quantity: input.quantity,
      unit_price: input.unit_price,
      status: input.status,
      created_at: input.created_at.toISOString(),
      subtotal: input.quantity * input.unit_price,
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      productSnapshot:
        await EcommerceMallProductSnapshotAtSummaryTransformer.transform(
          input.productSnapshot,
        ),
      sellerProfileSnapshot:
        await EcommerceMallSellerProfileSnapshotAtSummaryTransformer.transform(
          input.sellerProfileSnapshot,
        ),
    };
  }
}
