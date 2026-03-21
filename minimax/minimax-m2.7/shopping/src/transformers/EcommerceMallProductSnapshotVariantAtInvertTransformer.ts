import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductSnapshotAtSummaryTransformer } from "./EcommerceMallProductSnapshotAtSummaryTransformer";

export namespace EcommerceMallProductSnapshotVariantAtInvertTransformer {
  export type Payload =
    Prisma.ecommerce_mall_product_snapshot_variantsGetPayload<
      ReturnType<typeof select>
    >;
  export type OptionValuePayload =
    Prisma.ecommerce_mall_product_snapshot_variant_option_valuesGetPayload<{
      select: {
        id: true;
        key: true;
        value: true;
        created_at: true;
        productSnapshotVariant: {
          select: {
            id: true;
            sku: true;
            price_override: true;
            stock_quantity: true;
            created_at: true;
          };
        };
      };
    }>;
  export function select() {
    return {
      select: {
        id: true,
        sku: true,
        price_override: true,
        stock_quantity: true,
        created_at: true,
        productSnapshot:
          EcommerceMallProductSnapshotAtSummaryTransformer.select(),
        optionValues: {
          select: {
            id: true,
            key: true,
            value: true,
            created_at: true,
            productSnapshotVariant: {
              select: {
                id: true,
                sku: true,
                price_override: true,
                stock_quantity: true,
                created_at: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_product_snapshot_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshotVariant.IInvert> {
    return {
      id: input.id,
      sku: input.sku,
      price_override: input.price_override ?? null,
      stock_quantity: input.stock_quantity,
      created_at: toISOStringSafe(input.created_at),
      productSnapshot:
        await EcommerceMallProductSnapshotAtSummaryTransformer.transform(
          input.productSnapshot,
        ),
      optionValues: await ArrayUtil.asyncMap(
        input.optionValues,
        async (
          item: OptionValuePayload,
        ): Promise<IEcommerceMallProductVariantOptionValue> => {
          return {
            id: item.id,
            key: item.key,
            value: item.value,
            created_at: toISOStringSafe(item.created_at),
            updated_at: toISOStringSafe(item.created_at),
            variant: {
              created_at: toISOStringSafe(
                item.productSnapshotVariant.created_at,
              ),
              id: item.productSnapshotVariant.id,
              optionValues: [],
              price: item.productSnapshotVariant.price_override ?? null,
              quantity: item.productSnapshotVariant.stock_quantity,
              sku_code: item.productSnapshotVariant.sku,
            },
          };
        },
      ),
    };
  }
}
