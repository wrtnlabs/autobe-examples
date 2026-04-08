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
import { EcommerceMallCategoryAtTreeTransformer } from "./EcommerceMallCategoryAtTreeTransformer";

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
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: EcommerceMallCategoryAtSummaryTransformer.select(),
        subcategories: EcommerceMallCategoryAtTreeTransformer.select(),
        products: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategory> {
    // Filter out deleted subcategories for count and nested transform
    const activeSubcategories = input.subcategories.filter(
      (s) => !s.deleted_at,
    );
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      parent: input.parent
        ? await EcommerceMallCategoryAtSummaryTransformer.transform(
            input.parent,
          )
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at != null ? toISOStringSafe(input.deleted_at) : null,
      subcategories_count: activeSubcategories.length,
      subcategories: await ArrayUtil.asyncMap(activeSubcategories, (elem) =>
        EcommerceMallCategoryAtTreeTransformer.transform(elem),
      ),
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
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             subcategories_count: true,
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
//   parent: {IEcommerceMallCategory.ISummary | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   subcategories_count: {integer},
//   subcategories: {Array<IEcommerceMallCategory.ITree>},
//         };
//       }
//     }
//--------------------------------------------------------------