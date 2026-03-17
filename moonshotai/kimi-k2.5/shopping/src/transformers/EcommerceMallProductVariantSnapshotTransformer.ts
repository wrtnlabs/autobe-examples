import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductVariantSnapshotOptionValueTransformer } from "./EcommerceMallProductVariantSnapshotOptionValueTransformer";

export namespace EcommerceMallProductVariantSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_product_variant_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        product_variant_id: true,
        sku_code: true,
        price: true,
        created_at: true,
        optionValues:
          EcommerceMallProductVariantSnapshotOptionValueTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_product_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariantSnapshot> {
    return {
      id: input.id,
      productVariantId: input.product_variant_id,
      skuCode: input.sku_code,
      price: input.price,
      createdAt: input.created_at.toISOString(),
      optionValues: await ArrayUtil.asyncMap(
        input.optionValues,
        EcommerceMallProductVariantSnapshotOptionValueTransformer.transform,
      ),
    };
  }
}
