import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallProductSnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name_before: true,
        name_after: true,
        description_before: true,
        description_after: true,
        category_id_before: true,
        category_id_after: true,
        base_price_before: true,
        base_price_after: true,
        images_before: true,
        images_after: true,
        created_at: true,
        product: {
          select: {
            id: true,
          },
        },
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        variantSnapshots: {
          select: {},
        } satisfies Prisma.shopping_mall_product_snapshot_variantsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshot.ISummary> {
    return {
      id: input.id,
      product_id: input.product.id,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      name_before: input.name_before ?? null,
      name_after: input.name_after ?? null,
      description_before: input.description_before ?? null,
      description_after: input.description_after ?? null,
      category_id_before: input.category_id_before ?? null,
      category_id_after: input.category_id_after ?? null,
      base_price_before: input.base_price_before ?? null,
      base_price_after: input.base_price_after ?? null,
      images_before: input.images_before ?? null,
      images_after: input.images_after ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallProductSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_product_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name_before: true,
//             name_after: true,
//             description_before: true,
//             description_after: true,
//             category_id_before: true,
//             category_id_after: true,
//             base_price_before: true,
//             base_price_after: true,
//             images_before: true,
//             images_after: true,
//             created_at: true,
//             shopping_mall_product_id: true,
//             seller: ShoppingMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProductSnapshot.ISummary> {
//         return {
//   id: {string},
//   product_id: {string},
//   seller: await ShoppingMallSellerAtSummaryTransformer.transform(input.seller),
//   name_before: {string | null},
//   name_after: {string | null},
//   description_before: {string | null},
//   description_after: {string | null},
//   category_id_before: {string | null},
//   category_id_after: {string | null},
//   base_price_before: {number | null},
//   base_price_after: {number | null},
//   images_before: {string | null},
//   images_after: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------