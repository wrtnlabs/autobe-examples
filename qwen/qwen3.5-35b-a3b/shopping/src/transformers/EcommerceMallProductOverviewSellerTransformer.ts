import { IEcommerceMallProductOverviewSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverviewSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductOverviewSellerTransformer {
  export type Payload = Prisma.ecommerce_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        products: {
          select: { id: true },
          where: { deleted_at: null },
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductOverviewSeller> {
    return {
      seller_id: input.id,
      display_name: input.display_name,
      product_count: input.products.length,
    } satisfies IEcommerceMallProductOverviewSeller;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductOverviewSellerTransformer {
//       export type Payload = Prisma.ecommerce_mall_sellersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             display_name: true,
//             approval_status: true,
//             rejection_reason: true,
//             is_suspended: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductOverviewSeller> {
//         return {
//   seller_id: {string},
//   display_name: {string},
//   product_count: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------