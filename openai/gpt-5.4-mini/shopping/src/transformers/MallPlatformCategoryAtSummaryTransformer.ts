import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
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
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parentCategory: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            parentCategory: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.mall_platform_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      parentCategory: input.parentCategory
        ? {
            id: input.parentCategory.id,
            name: input.parentCategory.name,
            description: input.parentCategory.description,
            parentCategory: null,
            createdAt: input.parentCategory.created_at.toISOString(),
            updatedAt: input.parentCategory.updated_at.toISOString(),
            deletedAt: input.parentCategory.deleted_at?.toISOString() ?? null,
          }
        : null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformCategory.ISummary;
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
//   name: {string},
//   description: {string},
//   parentCategory: input.parent_category_id ? await cache.get(input.parent_category_id) : null,
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
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