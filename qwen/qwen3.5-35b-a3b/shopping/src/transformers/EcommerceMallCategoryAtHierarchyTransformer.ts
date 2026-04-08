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

export namespace EcommerceMallCategoryAtHierarchyTransformer {
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
        creator: EcommerceMallAdministratorAtSummaryTransformer.select(),
        children: EcommerceMallCategoryAtSummaryTransformer.select(),
        products: { select: { id: true } },
        parent: EcommerceMallCategoryAtSummaryTransformer.select(),
        ecommerceMallCategoriesSnapshotss: { select: { id: true } },
        productSnapshots: { select: { id: true } },
        ecommerceMallCategorySnapshots: { select: { id: true } },
        childCategories: { select: { id: true } },
      },
    } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategory.IHierarchy> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      sort_order: input.sort_order ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at != null ? toISOStringSafe(input.deleted_at) : null,
      creator_id: input.creator?.id ?? null,
      creator: input.creator
        ? await EcommerceMallAdministratorAtSummaryTransformer.transform(
            input.creator,
          )
        : null,
      children: await ArrayUtil.asyncMap(
        input.children,
        async (child) =>
          await EcommerceMallCategoryAtSummaryTransformer.transform(child),
      ),
      product_count: input.products.length,
    } satisfies IEcommerceMallCategory.IHierarchy;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCategoryAtHierarchyTransformer {
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
//             creator_id: true,
//             product_count: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCategory.IHierarchy> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   sort_order: {integer | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   creator_id: {string | null},
//   creator: {IEcommerceMallAdministrator.ISummary | null},
//   children: {Array<IEcommerceMallCategory.ISummary>},
//   product_count: {integer | null},
//         };
//       }
//     }
//--------------------------------------------------------------