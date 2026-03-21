import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductSnapshotVariantOptionValueTransformer } from "./EcommerceMallProductSnapshotVariantOptionValueTransformer";

export namespace EcommerceMallProductSnapshotVariantTransformer {
  export type Payload =
    Prisma.ecommerce_mall_product_snapshot_variantsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        sku: true,
        price_override: true,
        stock_quantity: true,
        created_at: true,
        productSnapshot: {
          select: {
            id: true,
          },
        },
        optionValues: {
          select: {
            id: true,
            key: true,
            value: true,
            created_at: true,
            productSnapshotVariant: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_product_snapshot_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshotVariant> {
    return {
      created_at: toISOStringSafe(input.created_at),
      id: input.id,
      optionValues: await ArrayUtil.asyncMap(
        input.optionValues,
        EcommerceMallProductSnapshotVariantOptionValueTransformer.transform,
      ),
      price_override: input.price_override,
      sku: input.sku,
      stock_quantity: input.stock_quantity,
    };
  }
}
