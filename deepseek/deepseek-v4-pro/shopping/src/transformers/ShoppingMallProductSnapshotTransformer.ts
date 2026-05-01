import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";
import { ShoppingMallProductSnapshotImageTransformer } from "./ShoppingMallProductSnapshotImageTransformer";
import { ShoppingMallProductVariantSnapshotTransformer } from "./ShoppingMallProductVariantSnapshotTransformer";

export namespace ShoppingMallProductSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshotsGetPayload<
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
        product: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_productsFindManyArgs,
        category: ShoppingMallCategoryAtSummaryTransformer.select(),
        snapshotImages: ShoppingMallProductSnapshotImageTransformer.select(),
        variantSnapshots:
          ShoppingMallProductVariantSnapshotTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshot> {
    return {
      id: input.id,
      product_id: input.product.id,
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      category: input.category
        ? await ShoppingMallCategoryAtSummaryTransformer.transform(
            input.category,
          )
        : null,
      images: await ArrayUtil.asyncMap(
        input.snapshotImages,
        ShoppingMallProductSnapshotImageTransformer.transform,
      ),
      variants: await ArrayUtil.asyncMap(
        input.variantSnapshots,
        ShoppingMallProductVariantSnapshotTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallProductSnapshot;
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
//             name: true,
//             description: true,
//             base_price: true,
//             created_at: true,
//             shopping_mall_product_id: true,
//             category: ShoppingMallCategoryAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProductSnapshot> {
//         return {
//   id: {string},
//   product_id: {string},
//   name: {string},
//   description: {string},
//   base_price: {number},
//   category: input.category ? await ShoppingMallCategoryAtSummaryTransformer.transform(input.category) : null,
//   images: {Array<IShoppingMallProductSnapshotImage>},
//   variants: {Array<IShoppingMallProductVariantSnapshot>},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------