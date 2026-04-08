import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductSnapshotVariantAtSummaryTransformer {
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
          select: { id: true },
        },
        optionValues: {
          select: { id: true },
        },
      },
    } satisfies Prisma.ecommerce_mall_product_snapshot_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshotVariant.ISummary> {
    return {
      id: input.id,
      sku: input.sku,
      price_override: input.price_override,
      stock_quantity: Number(input.stock_quantity),
      created_at: input.created_at.toISOString(),
    } satisfies IEcommerceMallProductSnapshotVariant.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductSnapshotVariantAtSummaryTransformer {
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
//           },
//         } satisfies Prisma.ecommerce_mall_product_snapshot_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductSnapshotVariant.ISummary> {
//         return {
//   id: {string},
//   sku: {string},
//   price_override: {number | null},
//   stock_quantity: {integer},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------