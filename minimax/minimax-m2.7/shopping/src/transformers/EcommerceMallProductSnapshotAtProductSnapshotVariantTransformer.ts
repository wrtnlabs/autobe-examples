import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductSnapshotVariantOptionValueTransformer } from "./EcommerceMallProductSnapshotVariantOptionValueTransformer";

export namespace EcommerceMallProductSnapshotAtProductSnapshotVariantTransformer {
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
        optionValues:
          EcommerceMallProductSnapshotVariantOptionValueTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_product_snapshot_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshot.IProductSnapshotVariant> {
    return {
      id: input.id,
      sku: input.sku,
      price_override: input.price_override ?? undefined,
      stock_quantity: Number(input.stock_quantity),
      created_at: input.created_at.toISOString(),
      optionValues: await ArrayUtil.asyncMap(
        input.optionValues,
        EcommerceMallProductSnapshotVariantOptionValueTransformer.transform,
      ),
    } satisfies IEcommerceMallProductSnapshot.IProductSnapshotVariant;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductSnapshotAtProductSnapshotVariantTransformer {
//       export type Payload = Prisma.ecommerce_mall_product_snapshot_variantsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             sku: true,
//             price_override: true,
//             stock_quantity: true,
//             created_at: true,
//             ecommerce_mall_product_snapshot_id: true,
//             optionValues: EcommerceMallProductSnapshotVariantOptionValueTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_product_snapshot_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductSnapshot.IProductSnapshotVariant> {
//         return {
//   id: {string},
//   sku: {string},
//   price_override: {number | null},
//   stock_quantity: {integer},
//   created_at: {string},
//   optionValues: await ArrayUtil.asyncMap(input.optionValues, EcommerceMallProductSnapshotVariantOptionValueTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------