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
        deleted_at: true,
        parent: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
        subcategories: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
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
  ): Promise<IEcommerceMallCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
    } satisfies IEcommerceMallCategory.ISummary;
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
//           },
//         } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCategory.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {null | string},
//         };
//       }
//     }
//--------------------------------------------------------------