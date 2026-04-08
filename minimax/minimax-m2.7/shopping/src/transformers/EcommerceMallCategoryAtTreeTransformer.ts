import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCategoryAtTreeTransformer {
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
        parent: undefined,
        subcategories: undefined,
        products: undefined,
      },
    } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IEcommerceMallCategory.ITree[]>,
      [string]
    > = createChildrenCache(),
  ): Promise<IEcommerceMallCategory.ITree> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      children: await cache.get(input.id),
    } satisfies IEcommerceMallCategory.ITree;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IEcommerceMallCategory.ITree[]> {
    const cache = createChildrenCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createChildrenCache() {
    const cache = new VariadicSingleton(
      async (parentId: string): Promise<IEcommerceMallCategory.ITree[]> => {
        const records =
          await MyGlobal.prisma.ecommerce_mall_categories.findMany({
            ...select(),
            where: { parent: { id: parentId } },
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
//     export namespace EcommerceMallCategoryAtTreeTransformer {
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
//             children: undefined, // DO NOT select recursive relation
//           },
//         } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IEcommerceMallCategory.ITree[]>, [string]> = createChildrenCache(),
//       ): Promise<IEcommerceMallCategory.ITree> {
//         return {
//   id: {string},
//   name: {string},
//   description: {null | string},
//   children: await cache.get(input.id),
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IEcommerceMallCategory.ITree[]> {
//         const cache = createChildrenCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createChildrenCache() {
//         const cache = new VariadicSingleton(
//           async (parentId: string): Promise<IEcommerceMallCategory.ITree[]> => {
//             const records =
//               await MyGlobal.prisma.ecommerce_mall_categories.findMany({
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