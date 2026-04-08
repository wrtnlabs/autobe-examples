import { IEcommerceMallCategoriesStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCategoriesStatisticTransformer {
  export type Payload = Prisma.ecommerce_mall_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        sort_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: {
          select: {},
        } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
        creator: {
          select: {},
        } satisfies Prisma.ecommerce_mall_administratorsFindManyArgs,
        products: {
          select: {},
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
        children: {
          select: {},
        } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
        ecommerceMallCategoriesSnapshotss: {
          select: {},
        } satisfies Prisma.ecommerce_mall_snapshotsFindManyArgs,
        productSnapshots: {
          select: {},
        } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs,
        ecommerceMallCategorySnapshots: {
          select: {},
        } satisfies Prisma.ecommerce_mall_categories_snapshotsFindManyArgs,
        childCategories: {
          select: {},
        } satisfies Prisma.ecommerce_mall_categories_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategoriesStatistic> {
    return {
      category_id: input.id,
      name: input.name,
      product_count: input.products.length,
    } satisfies IEcommerceMallCategoriesStatistic;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCategoriesStatisticTransformer {
//       export type Payload = Prisma.ecommerce_mall_categoriesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             sort_order: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             parent_id: true,
//             creator_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCategoriesStatistic> {
//         return {
//   category_id: {string},
//   name: {string},
//   product_count: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------