import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommercePlatformCategoryAtBrowsingTransformer {
  export type Payload = Prisma.ecommerce_platform_categoriesGetPayload<
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
        parentCategory: undefined,
        childrenCategories: undefined,
        products: undefined,
      },
    } satisfies Prisma.ecommerce_platform_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IEcommercePlatformCategory.IBrowsing[]>,
      [string]
    > = createChildrenCache(),
  ): Promise<IEcommercePlatformCategory.IBrowsing> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      children: await cache.get(input.id),
    };
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IEcommercePlatformCategory.IBrowsing[]> {
    const cache = createChildrenCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createChildrenCache() {
    const cache = new VariadicSingleton(
      async (
        parentId: string,
      ): Promise<IEcommercePlatformCategory.IBrowsing[]> => {
        const records =
          await MyGlobal.prisma.ecommerce_platform_categories.findMany({
            ...select(),
            where: { parent_ecommerce_platform_category_id: parentId },
          });
        return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
      },
    );
    return cache;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformCategoryAtBrowsingTransformer {
//       export type Payload = Prisma.ecommerce_platform_categoriesGetPayload<ReturnType<typeof select>>;
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
//             parent_ecommerce_platform_category_id: true,
//             children: undefined, // DO NOT select recursive relation
//           },
//         } satisfies Prisma.ecommerce_platform_categoriesFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IEcommercePlatformCategory.IBrowsing[]>, [string]> = createChildrenCache(),
//       ): Promise<IEcommercePlatformCategory.IBrowsing> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   children: await cache.get(input.id),
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IEcommercePlatformCategory.IBrowsing[]> {
//         const cache = createChildrenCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createChildrenCache() {
//         const cache = new VariadicSingleton(
//           async (parentId: string): Promise<IEcommercePlatformCategory.IBrowsing[]> => {
//             const records =
//               await MyGlobal.prisma.ecommerce_platform_categories.findMany({
//                 ...select(),
//                 where: { parent_ecommerce_platform_category_id: parentId },
//               });
//             return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
//           },
//         );
//         return cache;
//       }
//     }
//--------------------------------------------------------------