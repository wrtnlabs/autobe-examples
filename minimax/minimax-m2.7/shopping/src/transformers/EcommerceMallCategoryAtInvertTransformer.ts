import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";

export namespace EcommerceMallCategoryAtInvertTransformer {
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
        subcategories: EcommerceMallCategoryAtSummaryTransformer.select(),
        products: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategory.IInvert> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      parent: input.parent
        ? await EcommerceMallCategoryAtSummaryTransformer.transform(
            input.parent,
          )
        : undefined,
      subcategories: await ArrayUtil.asyncMap(input.subcategories, (elem) =>
        EcommerceMallCategoryAtSummaryTransformer.transform(elem),
      ),
    } satisfies IEcommerceMallCategory.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCategoryAtInvertTransformer {
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
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCategory.IInvert> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   parent: {IEcommerceMallCategory.ISummary | null},
//   subcategories: {Array<IEcommerceMallCategory.ISummary>},
//         };
//       }
//     }
//--------------------------------------------------------------