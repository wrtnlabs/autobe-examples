import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";

export namespace EcommerceMallInventoryRecordTransformer {
  export type Payload = Prisma.ecommerce_mall_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallInventoryRecord> {
    return {
      id: input.id,
      variantId: input.product_variant_id,
      quantityChange: input.quantity_change,
      reason: input.reason,
      createdAt: input.created_at.toISOString(),
      variant: await EcommerceMallProductVariantAtSummaryTransformer.transform(
        input.variant,
      ),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        product_variant_id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        variant: EcommerceMallProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs;
  }
}
