import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ECommerceMallCategoryAtSummaryTransformer {
  export type Payload = Prisma.e_commerce_mall_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent_id: true,
        parent: undefined,
        subcategories: undefined,
        _count: {
          select: {
            products: true,
          },
        },
      },
    } satisfies Prisma.e_commerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
    parentCache: VariadicSingleton<
      Promise<IECommerceMallCategory.ISummary>,
      [string]
    > = createParentCache(),
    childrenCache: VariadicSingleton<
      Promise<IECommerceMallCategory.ISummary[]>,
      [string]
    > = createChildrenCache(),
  ): Promise<IECommerceMallCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      parent: input.parent_id ? await parentCache.get(input.parent_id) : null,
      subcategories: await childrenCache.get(input.id),
      products_count: input._count.products,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallCategory.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IECommerceMallCategory.ISummary[]> {
    let parentCache!: VariadicSingleton<
      Promise<IECommerceMallCategory.ISummary>,
      [string]
    >;
    let childrenCache!: VariadicSingleton<
      Promise<IECommerceMallCategory.ISummary[]>,
      [string]
    >;
    parentCache = new VariadicSingleton(
      async (id: string): Promise<IECommerceMallCategory.ISummary> => {
        const record =
          await MyGlobal.prisma.e_commerce_mall_categories.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, parentCache, childrenCache);
      },
    );
    childrenCache = new VariadicSingleton(
      async (parentId: string): Promise<IECommerceMallCategory.ISummary[]> => {
        const records =
          await MyGlobal.prisma.e_commerce_mall_categories.findMany({
            ...select(),
            where: { parent_id: parentId },
          });
        return await ArrayUtil.asyncMap(records, (r) =>
          transform(r, parentCache, childrenCache),
        );
      },
    );
    return await ArrayUtil.asyncMap(inputs, (x) =>
      transform(x, parentCache, childrenCache),
    );
  }
  function createParentCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IECommerceMallCategory.ISummary> => {
        const record =
          await MyGlobal.prisma.e_commerce_mall_categories.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
  function createChildrenCache() {
    const cache = new VariadicSingleton(
      async (parentId: string): Promise<IECommerceMallCategory.ISummary[]> => {
        const records =
          await MyGlobal.prisma.e_commerce_mall_categories.findMany({
            ...select(),
            where: { parent_id: parentId },
          });
        const parentCache = createParentCache();
        return await ArrayUtil.asyncMap(records, (r) =>
          transform(r, parentCache, cache),
        );
      },
    );
    return cache;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallCategoryAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_categoriesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             parent_id: true,
//             parent: undefined, // DO NOT select recursive relation
//             subcategories: undefined, // DO NOT select recursive relation
//           },
//         } satisfies Prisma.e_commerce_mall_categoriesFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         parentCache: VariadicSingleton<Promise<IECommerceMallCategory.ISummary>, [string]> = createParentCache(),
//         childrenCache: VariadicSingleton<Promise<IECommerceMallCategory.ISummary[]>, [string]> = createChildrenCache(),
//       ): Promise<IECommerceMallCategory.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   parent: input.parent_id ? await parentCache.get(input.parent_id) : null,
//   subcategories: await childrenCache.get(input.id),
//   products_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IECommerceMallCategory.ISummary[]> {
//         // Create mutually-referencing caches so the entire tree shares
//         // one deduplication scope across both parent and children lookups.
//         // Use definite assignment assertions (!) so TypeScript does not
//         // flag the cross-references as "used before assigned" — the async
//         // callbacks only execute after both variables are fully initialized.
//         let parentCache!: VariadicSingleton<Promise<IECommerceMallCategory.ISummary>, [string]>;
//         let childrenCache!: VariadicSingleton<Promise<IECommerceMallCategory.ISummary[]>, [string]>;
//         parentCache = new VariadicSingleton(
//           async (id: string): Promise<IECommerceMallCategory.ISummary> => {
//             const record =
//               await MyGlobal.prisma.e_commerce_mall_categories.findFirstOrThrow({
//                 ...select(),
//                 where: { id },
//               });
//             return transform(record, parentCache, childrenCache);
//           },
//         );
//         childrenCache = new VariadicSingleton(
//           async (parentId: string): Promise<IECommerceMallCategory.ISummary[]> => {
//             const records =
//               await MyGlobal.prisma.e_commerce_mall_categories.findMany({
//                 ...select(),
//                 where: { parent_id: parentId },
//               });
//             return await ArrayUtil.asyncMap(records, (r) =>
//               transform(r, parentCache, childrenCache),
//             );
//           },
//         );
//         return await ArrayUtil.asyncMap(inputs, (x) =>
//           transform(x, parentCache, childrenCache),
//         );
//       }
// 
//       function createParentCache() {
//         const cache = new VariadicSingleton(
//           async (id: string): Promise<IECommerceMallCategory.ISummary> => {
//             const record =
//               await MyGlobal.prisma.e_commerce_mall_categories.findFirstOrThrow({
//                 ...select(),
//                 where: { id },
//               });
//             return transform(record, cache);
//           },
//         );
//         return cache;
//       }
// 
//       function createChildrenCache() {
//         const cache = new VariadicSingleton(
//           async (parentId: string): Promise<IECommerceMallCategory.ISummary[]> => {
//             const records =
//               await MyGlobal.prisma.e_commerce_mall_categories.findMany({
//                 ...select(),
//                 where: { parent_id: parentId },
//               });
//             // createParentCache() is called once per batch so all siblings
//             // in the same children list share one parent-deduplication scope.
//             const parentCache = createParentCache();
//             return await ArrayUtil.asyncMap(records, (r) =>
//               transform(r, parentCache, cache),
//             );
//           },
//         );
//         return cache;
//       }
//     }
//--------------------------------------------------------------