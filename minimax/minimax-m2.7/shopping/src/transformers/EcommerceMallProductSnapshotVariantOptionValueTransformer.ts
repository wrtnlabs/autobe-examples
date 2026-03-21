import { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductSnapshotVariantOptionValueTransformer {
  export type Payload =
    Prisma.ecommerce_mall_product_snapshot_variant_option_valuesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        value: true,
        created_at: true,
        productSnapshotVariant: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_product_snapshot_variantsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_product_snapshot_variant_option_valuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshotVariantOptionValue> {
    return {
      id: input.id,
      key: input.key,
      value: input.value,
      created_at: input.created_at.toISOString(),
    };
  }
}
