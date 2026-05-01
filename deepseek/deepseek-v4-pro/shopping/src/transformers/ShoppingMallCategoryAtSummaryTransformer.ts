import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCategoryAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_categoriesGetPayload<
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
        parent: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
        children: {
          select: { id: true, deleted_at: true },
        } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      parent_id: input.parent?.id ?? null,
      children_count: input.children.filter((c) => c.deleted_at === null)
        .length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IShoppingMallCategory.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCategoryAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_categoriesGetPayload<ReturnType<typeof select>>;
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
//           },
//         } satisfies Prisma.shopping_mall_categoriesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCategory.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   parent_id: {string | null},
//   children_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------