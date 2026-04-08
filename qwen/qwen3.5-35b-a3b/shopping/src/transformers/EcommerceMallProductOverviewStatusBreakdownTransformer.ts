import { IEcommerceMallProductOverviewStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverviewStatusBreakdown";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// Generated transformer for IEcommerceMallProductOverviewStatusBreakdown
export namespace EcommerceMallProductOverviewStatusBreakdownTransformer {
  export type Payload = Prisma.ecommerce_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        category: true,
        seller: true,
        wishlistItems: true,
        customerReviews: true,
        images: true,
        variants: true,
        reviews: true,
        reviewSnapshots: true,
        reviewStat: true,
        snapshots: true,
        productSnapshots: true,
        variantSnapshots: true,
      },
    } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload[],
  ): Promise<IEcommerceMallProductOverviewStatusBreakdown> {
    return {
      active: input.filter((p: Payload) => p.deleted_at === null).length,
      deleted: input.filter((p: Payload) => p.deleted_at !== null).length,
    } satisfies IEcommerceMallProductOverviewStatusBreakdown;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductOverviewStatusBreakdownTransformer {
//       export type Payload = Prisma.ecommerce_mall_productsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             active: true,
//             deleted: true,
//           },
//         } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductOverviewStatusBreakdown> {
//         return {
//   active: {integer},
//   deleted: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------