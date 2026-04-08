import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { ArrayUtil } from "@nestia/e2e";
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
        parentCategory: MallPlatformCategoryAtSummaryTransformer.select(),
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        products: true,
        subcategories: MallPlatformCategoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformCategory> {
    return {
      id: input.id,
      parentCategory: input.parentCategory
        ? await MallPlatformCategoryAtSummaryTransformer.transform(
            input.parentCategory,
          )
        : null,
      name: input.name,
      description: input.description,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      subcategories: await ArrayUtil.asyncMap(input.subcategories, (item) =>
        MallPlatformCategoryAtSummaryTransformer.transform(item),
      ),
    } satisfies IMallPlatformCategory;
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
//             createdAt: true,
//             updatedAt: true,
//             deletedAt: true,
//             ...
//           },
//         } satisfies Prisma.mall_platform_categoriesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformCategory> {
//         return {
//   id: {string},
//   parentCategory: {IMallPlatformCategory.ISummary | null},
//   name: {string},
//   description: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   subcategories: {Array<IMallPlatformCategory.ISummary>},
//         };
//       }
//     }
//--------------------------------------------------------------