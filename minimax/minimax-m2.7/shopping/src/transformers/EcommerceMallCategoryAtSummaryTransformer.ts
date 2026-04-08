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
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_categoriesFindFirstOrThrowArgs,
        subcategories: undefined,
      },
    } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
    parentCache: VariadicSingleton<
      Promise<IEcommerceMallCategory.ISummary>,
      [string]
    > = createParentCache(),
    childrenCache: VariadicSingleton<
      Promise<IEcommerceMallCategory.ISummary[]>,
      [string]
    > = createChildrenCache(),
  ): Promise<IEcommerceMallCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      createdAt: input.created_at.toISOString(),
      parent: input.parent?.id ? await parentCache.get(input.parent.id) : null,
      subcategories: await childrenCache.get(input.id),
    } satisfies IEcommerceMallCategory.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IEcommerceMallCategory.ISummary[]> {
    let parentCache!: VariadicSingleton<
      Promise<IEcommerceMallCategory.ISummary>,
      [string]
    >;
    let childrenCache!: VariadicSingleton<
      Promise<IEcommerceMallCategory.ISummary[]>,
      [string]
    >;
    parentCache = new VariadicSingleton(
      async (id: string): Promise<IEcommerceMallCategory.ISummary> => {
        const record =
          await MyGlobal.prisma.ecommerce_mall_categories.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, parentCache, childrenCache);
      },
    );
    childrenCache = new VariadicSingleton(
      async (parentId: string): Promise<IEcommerceMallCategory.ISummary[]> => {
        const records =
          await MyGlobal.prisma.ecommerce_mall_categories.findMany({
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
  function createChildrenCache() {
    const cache = new VariadicSingleton(
      async (parentId: string): Promise<IEcommerceMallCategory.ISummary[]> => {
        const records =
          await MyGlobal.prisma.ecommerce_mall_categories.findMany({
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
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             parent_id: true,
//             parent: undefined, // DO NOT select recursive relation
//             subcategories: undefined, // DO NOT select recursive relation
//           },
//         } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         parentCache: VariadicSingleton<Promise<IEcommerceMallCategory.ISummary>, [string]> = createParentCache(),
//         childrenCache: VariadicSingleton<Promise<IEcommerceMallCategory.ISummary[]>, [string]> = createChildrenCache(),
//       ): Promise<IEcommerceMallCategory.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   createdAt: {string},
//   parent: input.parent_id ? await parentCache.get(input.parent_id) : null,
//   subcategories: await childrenCache.get(input.id),
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IEcommerceMallCategory.ISummary[]> {
//         // Create mutually-referencing caches so the entire tree shares
//         // one deduplication scope across both parent and children lookups.
//         // Use definite assignment assertions (!) so TypeScript does not
//         // flag the cross-references as "used before assigned" — the async
//         // callbacks only execute after both variables are fully initialized.
//         let parentCache!: VariadicSingleton<Promise<IEcommerceMallCategory.ISummary>, [string]>;
//         let childrenCache!: VariadicSingleton<Promise<IEcommerceMallCategory.ISummary[]>, [string]>;
//         parentCache = new VariadicSingleton(
//           async (id: string): Promise<IEcommerceMallCategory.ISummary> => {
//             const record =
//               await MyGlobal.prisma.ecommerce_mall_categories.findFirstOrThrow({
//                 ...select(),
//                 where: { id },
//               });
//             return transform(record, parentCache, childrenCache);
//           },
//         );
//         childrenCache = new VariadicSingleton(
//           async (parentId: string): Promise<IEcommerceMallCategory.ISummary[]> => {
//             const records =
//               await MyGlobal.prisma.ecommerce_mall_categories.findMany({
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
// 
//       function createChildrenCache() {
//         const cache = new VariadicSingleton(
//           async (parentId: string): Promise<IEcommerceMallCategory.ISummary[]> => {
//             const records =
//               await MyGlobal.prisma.ecommerce_mall_categories.findMany({
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