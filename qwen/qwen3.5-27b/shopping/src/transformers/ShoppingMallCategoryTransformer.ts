import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";

export namespace ShoppingMallCategoryTransformer {
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
        deleted_at: true,
        subcategories: ShoppingMallCategoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCategory> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      subcategories: await ArrayUtil.asyncMap(
        input.subcategories,
        async (item) =>
          ShoppingMallCategoryAtSummaryTransformer.transform(item),
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCategoryTransformer {
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
//             ...
//           },
//         } satisfies Prisma.shopping_mall_categoriesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCategory> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   subcategories: {Array<IShoppingMallCategory.ISummary>},
//         };
//       }
//     }
//--------------------------------------------------------------