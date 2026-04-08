import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformCategoryAtSummaryTransformer {
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
      },
    } satisfies Prisma.mall_platform_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IMallPlatformCategory.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IMallPlatformCategory.ISummary> {
    return {
      id: input.id,
      parentCategory: input.parent_category_id
        ? await cache.get(input.parent_category_id)
        : null,
      name: input.name,
      description: input.description,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformCategory.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IMallPlatformCategory.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IMallPlatformCategory.ISummary> => {
        const record =
          await MyGlobal.prisma.mall_platform_categories.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformCategoryAtSummaryTransformer {
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
//             parentCategory: undefined, // DO NOT select recursive relation
//           },
//         } satisfies Prisma.mall_platform_categoriesFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IMallPlatformCategory.ISummary>, [string]> = createParentCache(),
//       ): Promise<IMallPlatformCategory.ISummary> {
//         return {
//   id: {string},
//   parentCategory: input.parent_category_id ? await cache.get(input.parent_category_id) : null,
//   name: {string},
//   description: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IMallPlatformCategory.ISummary[]> {
//         const cache = createParentCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createParentCache() {
//         const cache = new VariadicSingleton(
//           async (id: string): Promise<IMallPlatformCategory.ISummary> => {
//             const record =
//               await MyGlobal.prisma.mall_platform_categories.findFirstOrThrow({
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