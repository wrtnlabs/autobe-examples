import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        ecommerce_mall_product_variant_snapshot_id: true,
        option_name: true,
        option_value: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_product_variant_snapshot_option_valuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariantSnapshotOptionValue> {
    return {
      id: input.id,
      ecommerce_mall_product_variant_snapshot_id:
        input.ecommerce_mall_product_variant_snapshot_id,
      option_name: input.option_name,
      option_value: input.option_value,
      created_at: input.created_at.toISOString(),
    };
  }
}
