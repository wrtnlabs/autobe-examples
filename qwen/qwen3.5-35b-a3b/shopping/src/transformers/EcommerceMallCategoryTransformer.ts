import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdministratorAtSummaryTransformer } from "./EcommerceMallAdministratorAtSummaryTransformer";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";

export namespace EcommerceMallCategoryTransformer {
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
        parent: EcommerceMallCategoryAtSummaryTransformer.select(),
        creator: EcommerceMallAdministratorAtSummaryTransformer.select(),
        children: EcommerceMallCategoryAtSummaryTransformer.select(),
        products: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
        ecommerceMallCategoriesSnapshotss: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_snapshotsFindManyArgs,
        productSnapshots: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs,
        ecommerceMallCategorySnapshots: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_categories_snapshotsFindManyArgs,
        childCategories: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_categories_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategory> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      sort_order: input.sort_order ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      parent_id: input.parent?.id ?? null,
      creator_id: input.creator?.id ?? null,
      parent: input.parent
        ? await EcommerceMallCategoryAtSummaryTransformer.transform(
            input.parent,
          )
        : null,
      creator: input.creator
        ? await EcommerceMallAdministratorAtSummaryTransformer.transform(
            input.creator,
          )
        : null,
      children: await ArrayUtil.asyncMap(input.children, (child) =>
        EcommerceMallCategoryAtSummaryTransformer.transform(child),
      ),
    } satisfies IEcommerceMallCategory;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCategoryTransformer {
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
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCategory> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   sort_order: {integer | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   parent_id: {string | null},
//   creator_id: {string | null},
//   parent: {IEcommerceMallCategory.ISummary | null},
//   creator: {IEcommerceMallAdministrator.ISummary | null},
//   children: {Array<IEcommerceMallCategory.ISummary>},
//         };
//       }
//     }
//--------------------------------------------------------------