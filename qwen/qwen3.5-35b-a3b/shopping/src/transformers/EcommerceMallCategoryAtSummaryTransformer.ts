import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCategoryAtSummaryTransformer {
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
        parent: undefined, // Set to undefined to avoid recursion
        creator: undefined, // Not needed for summary
        products: undefined, // Not needed for summary
        children: undefined, // Not needed for summary
        ecommerceMallCategoriesSnapshotss: undefined, // Not needed for summary
        productSnapshots: undefined, // Not needed for summary
        ecommerceMallCategorySnapshots: undefined, // Not needed for summary
        childCategories: undefined, // Not needed for summary
      },
    } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IEcommerceMallCategory.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IEcommerceMallCategory.ISummary> {
    // parent_id is not in select payload, so we need to query it separately
    // This is a limitation - we can't access input.parent_id
    // Solution: Use a different approach - select parent_id as a scalar
    // But parent_id is not a valid Prisma member...
    // Actually, the recursive parent needs special handling
    // We'll use the parent_id FK in the cache query's WHERE clause
    const parentId = await get_parent_id(input.id);
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      sort_order: input.sort_order ?? null,
      parent: parentId ? await cache.get(parentId) : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommerceMallCategory.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IEcommerceMallCategory.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IEcommerceMallCategory.ISummary> => {
        const record =
          await MyGlobal.prisma.ecommerce_mall_categories.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
  // Helper to get parent_id for a category
  async function get_parent_id(categoryId: string): Promise<string | null> {
    const result = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
      select: { parent_id: true },
      where: { id: categoryId },
    });
    return result?.parent_id ?? null;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCategoryAtSummaryTransformer {
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
//             parent_id: true,
//             parent: undefined, // DO NOT select recursive relation
//           },
//         } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IEcommerceMallCategory.ISummary>, [string]> = createParentCache(),
//       ): Promise<IEcommerceMallCategory.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   sort_order: {integer | null},
//   parent: input.parent_id ? await cache.get(input.parent_id) : null,
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IEcommerceMallCategory.ISummary[]> {
//         const cache = createParentCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createParentCache() {
//         const cache = new VariadicSingleton(
//           async (id: string): Promise<IEcommerceMallCategory.ISummary> => {
//             const record =
//               await MyGlobal.prisma.ecommerce_mall_categories.findFirstOrThrow({
//                 ...select(),
//                 where: { id },
//               });
//             return transform(record, cache);
//           },
//         );
//         return cache;
//       }
//     }
//--------------------------------------------------------------