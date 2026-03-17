import { IEcommerceMallOrderItemVariantSnapshotAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshotAttribute";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallOrderItemVariantSnapshotAttributeTransformer {
  export type Payload =
    Prisma.ecommerce_mall_order_item_variant_snapshot_attributesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        option_key: true,
        option_value: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_order_item_variant_snapshot_attributesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItemVariantSnapshotAttribute> {
    return {
      id: input.id,
      optionKey: input.option_key,
      optionValue: input.option_value,
      createdAt: input.created_at.toISOString(),
    };
  }
}
