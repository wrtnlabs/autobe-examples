import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductAtAnalyticAtCategoryDistributionTransformer {
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
        parent: true,
        subcategories: true,
        products: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProduct.IAnalytic.ICategoryDistribution> {
    return {
      categoryId: input.id,
      categoryName: input.name,
      productCount: input._count.products,
    } satisfies IEcommerceMallProduct.IAnalytic.ICategoryDistribution;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductAtAnalyticAtCategoryDistributionTransformer {
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
//       export async function transform(input: Payload): Promise<IEcommerceMallProduct.IAnalytic.ICategoryDistribution> {
//         return {
//   categoryId: {string},
//   categoryName: {string},
//   productCount: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------