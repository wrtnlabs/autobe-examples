import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEcommerceMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderItemProductSnapshotAtSummaryTransformer } from "./EcommerceMallOrderItemProductSnapshotAtSummaryTransformer";
import { EcommerceMallOrderItemSellerSnapshotAtSummaryTransformer } from "./EcommerceMallOrderItemSellerSnapshotAtSummaryTransformer";
import { EcommerceMallOrderItemVariantSnapshotAtSummaryTransformer } from "./EcommerceMallOrderItemVariantSnapshotAtSummaryTransformer";

export namespace EcommerceMallOrderItemSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_order_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        productSnapshot:
          EcommerceMallOrderItemProductSnapshotAtSummaryTransformer.select(),
        variantSnapshot:
          EcommerceMallOrderItemVariantSnapshotAtSummaryTransformer.select(),
        sellerSnapshot:
          EcommerceMallOrderItemSellerSnapshotAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItemSnapshot.ISummary> {
    return {
      id: input.id,
      productSnapshot:
        await EcommerceMallOrderItemProductSnapshotAtSummaryTransformer.transform(
          input.productSnapshot,
        ),
      variantSnapshot:
        await EcommerceMallOrderItemVariantSnapshotAtSummaryTransformer.transform(
          input.variantSnapshot,
        ),
      sellerSnapshot:
        await EcommerceMallOrderItemSellerSnapshotAtSummaryTransformer.transform(
          input.sellerSnapshot,
        ),
      createdAt: input.created_at.toISOString(),
    };
  }
}
