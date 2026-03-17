import { IEcommerceMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshot";
import { IEcommerceMallOrderItemVariantSnapshotAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshotAttribute";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderItemVariantSnapshotAttributeTransformer } from "./EcommerceMallOrderItemVariantSnapshotAttributeTransformer";

export namespace EcommerceMallOrderItemVariantSnapshotTransformer {
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
        attributes:
          EcommerceMallOrderItemVariantSnapshotAttributeTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_order_item_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItemVariantSnapshot> {
    return {
      id: input.id,
      skuCode: input.sku_code,
      price: input.price,
      createdAt: input.created_at.toISOString(),
      attributes: await ArrayUtil.asyncMap(
        input.attributes,
        EcommerceMallOrderItemVariantSnapshotAttributeTransformer.transform,
      ),
    };
  }
}
