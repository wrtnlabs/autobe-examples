import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";

export namespace EcommerceMallProductSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ecommerce_mall_product_id: true,
        ecommerce_mall_product_variant_snapshot_id: true,
        ecommerce_mall_seller_snapshot_id: true,
        ecommerce_mall_category_id: true,
        category: EcommerceMallCategoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      base_price: Number(input.base_price),
      created_at: input.created_at.toISOString(),
      entity_status: "active",
      action: "snapshot",
      category: await EcommerceMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
    } satisfies IEcommerceMallProductSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_product_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             base_price: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ecommerce_mall_product_id: true,
//             ecommerce_mall_product_variant_snapshot_id: true,
//             ecommerce_mall_seller_snapshot_id: true,
//             category: EcommerceMallCategoryAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductSnapshot.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   base_price: {number},
//   created_at: {string},
//   entity_status: {string},
//   action: {string},
//   category: await EcommerceMallCategoryAtSummaryTransformer.transform(input.category),
//         };
//       }
//     }
//--------------------------------------------------------------