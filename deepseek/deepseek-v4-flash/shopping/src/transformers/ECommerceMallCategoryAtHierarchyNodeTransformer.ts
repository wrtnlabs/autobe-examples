import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallCategoryAtSummaryTransformer } from "./ECommerceMallCategoryAtSummaryTransformer";

export namespace ECommerceMallCategoryAtHierarchyNodeTransformer {
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
        _count: { select: { products: true } },
      },
    } satisfies Prisma.e_commerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IECommerceMallCategory.IHierarchyNode[]>,
      [string]
    > = createChildrenCache(),
  ): Promise<IECommerceMallCategory.IHierarchyNode> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      parent: await resolveParent(input.parent_id),
      subcategories: await cache.get(input.id),
      products_count: input._count.products,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallCategory.IHierarchyNode;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IECommerceMallCategory.IHierarchyNode[]> {
    const cache = createChildrenCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  async function resolveParent(
    parentId: string | null,
  ): Promise<IECommerceMallCategory.ISummary | null> {
    if (parentId === null) return null;
    const record =
      await MyGlobal.prisma.e_commerce_mall_categories.findFirstOrThrow({
        ...ECommerceMallCategoryAtSummaryTransformer.select(),
        where: { id: parentId },
      });
    return await ECommerceMallCategoryAtSummaryTransformer.transform(record);
  }
  function createChildrenCache(): VariadicSingleton<
    Promise<IECommerceMallCategory.IHierarchyNode[]>,
    [string]
  > {
    let cache!: VariadicSingleton<
      Promise<IECommerceMallCategory.IHierarchyNode[]>,
      [string]
    >;
    cache = new VariadicSingleton(async (parentId) => {
      const records = await MyGlobal.prisma.e_commerce_mall_categories.findMany(
        {
          ...select(),
          where: { parent_id: parentId },
        },
      );
      return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
    });
    return cache;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallCategoryAtHierarchyNodeTransformer {
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
//             subcategories: undefined, // DO NOT select recursive relation
//             ...
//           },
//         } satisfies Prisma.e_commerce_mall_categoriesFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IECommerceMallCategory.IHierarchyNode[]>, [string]> = createChildrenCache(),
//       ): Promise<IECommerceMallCategory.IHierarchyNode> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   parent: {IECommerceMallCategory.ISummary | null},
//   subcategories: await cache.get(input.id),
//   products_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IECommerceMallCategory.IHierarchyNode[]> {
//         const cache = createChildrenCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createChildrenCache() {
//         const cache = new VariadicSingleton(
//           async (parentId: string): Promise<IECommerceMallCategory.IHierarchyNode[]> => {
//             const records =
//               await MyGlobal.prisma.e_commerce_mall_categories.findMany({
//                 ...select(),
//                 where: { parent_id: parentId },
//               });
//             return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
//           },
//         );
//         return cache;
//       }
//     }
//--------------------------------------------------------------