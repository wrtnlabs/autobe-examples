import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommercePlatformCategoryAtSummaryTransformer {
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
        parent_ecommerce_platform_category_id: true,
        parentCategory: undefined,
      },
    } satisfies Prisma.ecommerce_platform_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IEcommercePlatformCategory.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IEcommercePlatformCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      parent: input.parent_ecommerce_platform_category_id
        ? await cache.get(input.parent_ecommerce_platform_category_id)
        : null,
      created_at: input.created_at.toISOString(),
    };
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IEcommercePlatformCategory.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IEcommercePlatformCategory.ISummary> => {
        const record =
          await MyGlobal.prisma.ecommerce_platform_categories.findFirstOrThrow({
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
//     export namespace EcommercePlatformCategoryAtSummaryTransformer {
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
//             parentCategory: undefined, // DO NOT select recursive relation
//           },
//         } satisfies Prisma.ecommerce_platform_categoriesFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IEcommercePlatformCategory.ISummary>, [string]> = createParentCache(),
//       ): Promise<IEcommercePlatformCategory.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   parent: input.parent_ecommerce_platform_category_id ? await cache.get(input.parent_ecommerce_platform_category_id) : null,
//   created_at: {string},
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IEcommercePlatformCategory.ISummary[]> {
//         const cache = createParentCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createParentCache() {
//         const cache = new VariadicSingleton(
//           async (id: string): Promise<IEcommercePlatformCategory.ISummary> => {
//             const record =
//               await MyGlobal.prisma.ecommerce_platform_categories.findFirstOrThrow({
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