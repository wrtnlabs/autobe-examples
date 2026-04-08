import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";

export namespace EcommerceMallCategoryTransformer {
  export type Payload = Prisma.ecommerce_mall_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        parent_id: true,
        parent: EcommerceMallCategoryAtSummaryTransformer.select(),
        subcategories: EcommerceMallCategoryAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategory> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      parentId: input.parent_id ?? null,
      parent: input.parent
        ? await EcommerceMallCategoryAtSummaryTransformer.transform(
            input.parent,
          )
        : null,
      subcategories: await ArrayUtil.asyncMap(input.subcategories, (sub) =>
        EcommerceMallCategoryAtSummaryTransformer.transform(sub),
      ),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IEcommerceMallCategory;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCategoryTransformer {
//       export type Payload = Prisma.ecommerce_mall_categoriesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             parentId: true,
//             createdAt: true,
//             updatedAt: true,
//             deletedAt: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCategory> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   parentId: {string | null},
//   parent: {IEcommerceMallCategory.ISummary | null},
//   subcategories: {Array<IEcommerceMallCategory.ISummary>},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------