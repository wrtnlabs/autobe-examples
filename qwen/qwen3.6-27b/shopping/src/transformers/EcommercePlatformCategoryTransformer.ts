import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformCategoryAtSummaryTransformer } from "./EcommercePlatformCategoryAtSummaryTransformer";

export namespace EcommercePlatformCategoryTransformer {
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
        parentCategory: EcommercePlatformCategoryAtSummaryTransformer.select(),
        childrenCategories:
          EcommercePlatformCategoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformCategory> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      parentCategory: input.parentCategory
        ? await EcommercePlatformCategoryAtSummaryTransformer.transform(
            input.parentCategory,
          )
        : null,
      childrenCategories: await ArrayUtil.asyncMap(
        input.childrenCategories,
        async (child) =>
          EcommercePlatformCategoryAtSummaryTransformer.transform(child),
      ),
    } satisfies IEcommercePlatformCategory;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformCategoryTransformer {
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
//             ...
//           },
//         } satisfies Prisma.ecommerce_platform_categoriesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformCategory> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   parentCategory: {IEcommercePlatformCategory.ISummary | null},
//   childrenCategories: {Array<IEcommercePlatformCategory.ISummary>},
//         };
//       }
//     }
//--------------------------------------------------------------