import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerProfileAtSummaryTransformer } from "./EcommerceMallSellerProfileAtSummaryTransformer";

export namespace EcommerceMallSellerProfileSnapshotTransformer {
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
        sellerProfile: EcommerceMallSellerProfileAtSummaryTransformer.select(),
        orderItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerProfileSnapshot> {
    return {
      id: input.id,
      shopName: input.shop_name,
      shopDescription: input.shop_description ?? null,
      logoUrl: input.logo_url ?? null,
      createdAt: input.created_at.toISOString(),
      sellerProfile:
        await EcommerceMallSellerProfileAtSummaryTransformer.transform(
          input.sellerProfile,
        ),
    } satisfies IEcommerceMallSellerProfileSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerProfileSnapshotTransformer {
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
//             sellerProfile: EcommerceMallSellerProfileAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerProfileSnapshot> {
//         return {
//   id: {string},
//   shopName: {string},
//   shopDescription: {null | string},
//   logoUrl: {null | string},
//   createdAt: {string},
//   sellerProfile: await EcommerceMallSellerProfileAtSummaryTransformer.transform(input.sellerProfile),
//         };
//       }
//     }
//--------------------------------------------------------------