import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductVariantSnapshotOptionValueTransformer {
  export type Payload =
    Prisma.ecommerce_mall_product_variant_snapshot_option_valuesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        option_name: true,
        option_value: true,
        created_at: true,
        // productVariantSnapshot not selected - not needed for this DTO
      },
    } satisfies Prisma.ecommerce_mall_product_variant_snapshot_option_valuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariantSnapshotOptionValue> {
    return {
      id: input.id,
      optionName: input.option_name,
      optionValue: input.option_value,
      createdAt: input.created_at.toISOString(),
    };
  }
}
