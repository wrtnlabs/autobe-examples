import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariant";
import { IShoppingMallProductSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductSnapshotVariantTransformer } from "./ShoppingMallProductSnapshotVariantTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallProductSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        product: { select: { id: true } },
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
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
        variantSnapshots:
          ShoppingMallProductSnapshotVariantTransformer.select(),
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshot> {
    return {
      id: input.id,
      productId: input.product.id,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      nameBefore: input.name_before,
      nameAfter: input.name_after,
      descriptionBefore: input.description_before,
      descriptionAfter: input.description_after,
      categoryIdBefore: input.category_id_before,
      categoryIdAfter: input.category_id_after,
      basePriceBefore: input.base_price_before,
      basePriceAfter: input.base_price_after,
      imagesBefore: input.images_before,
      imagesAfter: input.images_after,
      variantSnapshots: await ArrayUtil.asyncMap(
        input.variantSnapshots,
        ShoppingMallProductSnapshotVariantTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallProductSnapshotTransformer {
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
//             variantSnapshots: ShoppingMallProductSnapshotVariantTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProductSnapshot> {
//         return {
//   id: {string},
//   productId: {string},
//   seller: await ShoppingMallSellerAtSummaryTransformer.transform(input.seller),
//   nameBefore: {string | null},
//   nameAfter: {string | null},
//   descriptionBefore: {string | null},
//   descriptionAfter: {string | null},
//   categoryIdBefore: {string | null},
//   categoryIdAfter: {string | null},
//   basePriceBefore: {number | null},
//   basePriceAfter: {number | null},
//   imagesBefore: {string | null},
//   imagesAfter: {string | null},
//   variantSnapshots: await ArrayUtil.asyncMap(input.variantSnapshots, ShoppingMallProductSnapshotVariantTransformer.transform),
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------