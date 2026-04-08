import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerProfileSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_seller_profile_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        logo_url: true,
        created_at: true,
        sellerProfile: {
          select: {
            id: true,
          },
        },
        orderItems: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerProfileSnapshot.ISummary> {
    return {
      id: input.id,
      shopName: input.shop_name,
      shopDescription: input.shop_description,
      logoUrl: input.logo_url,
      createdAt: input.created_at.toISOString(),
    } satisfies IEcommerceMallSellerProfileSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerProfileSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_seller_profile_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             shop_name: true,
//             shop_description: true,
//             logo_url: true,
//             created_at: true,
//             ecommerce_mall_seller_profile_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerProfileSnapshot.ISummary> {
//         return {
//   id: {string},
//   shopName: {string},
//   shopDescription: {string | null},
//   logoUrl: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------