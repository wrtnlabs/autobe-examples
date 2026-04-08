import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";
import { EcommerceMallProductVariantSnapshotAtSummaryTransformer } from "./EcommerceMallProductVariantSnapshotAtSummaryTransformer";
import { EcommerceMallSellerSnapshotAtSummaryTransformer } from "./EcommerceMallSellerSnapshotAtSummaryTransformer";

export namespace EcommerceMallProductSnapshotTransformer {
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
        product: true,
        variantSnapshot:
          EcommerceMallProductVariantSnapshotAtSummaryTransformer.select(),
        sellerSnapshot:
          EcommerceMallSellerSnapshotAtSummaryTransformer.select(),
        category: EcommerceMallCategoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshot> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      base_price: Number(input.base_price),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      category: await EcommerceMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      sellerSnapshot:
        await EcommerceMallSellerSnapshotAtSummaryTransformer.transform(
          input.sellerSnapshot,
        ),
      variantSnapshot: input.variantSnapshot
        ? await EcommerceMallProductVariantSnapshotAtSummaryTransformer.transform(
            input.variantSnapshot,
          )
        : null,
    } satisfies IEcommerceMallProductSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductSnapshotTransformer {
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
//             variantSnapshot: EcommerceMallProductVariantSnapshotAtSummaryTransformer.select(),
//             sellerSnapshot: EcommerceMallSellerSnapshotAtSummaryTransformer.select(),
//             category: EcommerceMallCategoryAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductSnapshot> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   base_price: {number},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   category: await EcommerceMallCategoryAtSummaryTransformer.transform(input.category),
//   sellerSnapshot: await EcommerceMallSellerSnapshotAtSummaryTransformer.transform(input.sellerSnapshot),
//   variantSnapshot: input.variantSnapshot ? await EcommerceMallProductVariantSnapshotAtSummaryTransformer.transform(input.variantSnapshot) : null,
//         };
//       }
//     }
//--------------------------------------------------------------