import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
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
        parent_id: true,
        parent: undefined,
        subcategories: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
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
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      parentId: input.parent_id,
      parent: input.parent_id ? await cache.get(input.parent_id) : null,
      subcategoryCount: input.subcategories.length,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IEcommerceMallCategory.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache(): VariadicSingleton<
    Promise<IEcommerceMallCategory.ISummary>,
    [string]
  > {
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
//   parentId: {string | null},
//   parent: input.parent_id ? await cache.get(input.parent_id) : null,
//   subcategoryCount: {integer},
//   createdAt: {string},
//   updatedAt: {string},
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