import { IEcommerceMallProductOverviewRecentProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverviewRecentProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductOverviewRecentProductTransformer {
  export type Payload = Prisma.ecommerce_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        category_id: true,
        base_price: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductOverviewRecentProduct> {
    return {
      id: input.id,
      name: input.name,
      category_id: input.category_id,
      base_price: Number(input.base_price),
      created_at: input.created_at.toISOString(),
    } satisfies IEcommerceMallProductOverviewRecentProduct;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductOverviewRecentProductTransformer {
//       export type Payload = Prisma.ecommerce_mall_productsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             base_price: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             category_id: true,
//             seller_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductOverviewRecentProduct> {
//         return {
//   id: {string},
//   name: {string},
//   category_id: {string},
//   base_price: {number},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------