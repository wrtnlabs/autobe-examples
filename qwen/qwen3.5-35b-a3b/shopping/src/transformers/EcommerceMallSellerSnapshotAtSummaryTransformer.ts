import { IEcommerceMallSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        shop_logo: true,
        created_at: true,
        seller: true,
        productSnapshots: true,
      },
    } satisfies Prisma.ecommerce_mall_seller_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerSnapshot.ISummary> {
    return {
      id: input.id,
      shop_name: input.shop_name,
      shop_description: input.shop_description,
      shop_logo: input.shop_logo ?? null,
      created_at: input.created_at.toISOString(),
    } satisfies IEcommerceMallSellerSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_seller_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             shop_name: true,
//             shop_description: true,
//             shop_logo: true,
//             created_at: true,
//             seller_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_seller_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerSnapshot.ISummary> {
//         return {
//   id: {string},
//   shop_name: {string},
//   shop_description: {string},
//   shop_logo: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------