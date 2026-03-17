import { IEcommerceMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallOrderItemVariantSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_order_item_variant_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_order_item_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItemVariantSnapshot.ISummary> {
    return {
      id: input.id,
      skuCode: input.sku_code,
      price: Number(input.price),
      createdAt: input.created_at.toISOString(),
    };
  }
}
