import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformCategoryAtSummaryTransformer } from "./MallPlatformCategoryAtSummaryTransformer";

export namespace MallPlatformCategoryTransformer {
  export type Payload = Prisma.mall_platform_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        parent_category_id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parentCategory: MallPlatformCategoryAtSummaryTransformer.select(),
        products: { select: { id: true } },
      },
    } satisfies Prisma.mall_platform_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IMallPlatformCategory[]>,
      [string]
    > = createChildrenCache(),
  ): Promise<IMallPlatformCategory> {
    return {
      id: input.id,
      parentCategoryId: input.parent_category_id,
      name: input.name,
      description: input.description,
      parentCategory: input.parentCategory
        ? await MallPlatformCategoryAtSummaryTransformer.transform(
            input.parentCategory,
          )
        : null,
      subcategories: await cache.get(input.id),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformCategory;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IMallPlatformCategory[]> {
    const cache = createChildrenCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createChildrenCache() {
    const cache = new VariadicSingleton(
      async (parentId: string): Promise<IMallPlatformCategory[]> => {
        const records = await MyGlobal.prisma.mall_platform_categories.findMany(
          {
            ...select(),
            where: { parent_category_id: parentId },
          },
        );
        return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
      },
    );
    return cache;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformCategoryTransformer {
//       export type Payload = Prisma.mall_platform_categoriesGetPayload<ReturnType<typeof select>>;
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
//             parent_category_id: true,
//             subcategories: undefined, // DO NOT select recursive relation
//             ...
//           },
//         } satisfies Prisma.mall_platform_categoriesFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IMallPlatformCategory[]>, [string]> = createChildrenCache(),
//       ): Promise<IMallPlatformCategory> {
//         return {
//   id: {string},
//   parentCategoryId: {string | null},
//   name: {string},
//   description: {string},
//   parentCategory: {IMallPlatformCategory.ISummary | null},
//   subcategories: await cache.get(input.id),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IMallPlatformCategory[]> {
//         const cache = createChildrenCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createChildrenCache() {
//         const cache = new VariadicSingleton(
//           async (parentId: string): Promise<IMallPlatformCategory[]> => {
//             const records =
//               await MyGlobal.prisma.mall_platform_categories.findMany({
//                 ...select(),
//                 where: { parent_category_id: parentId },
//               });
//             return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
//           },
//         );
//         return cache;
//       }
//     }
//--------------------------------------------------------------