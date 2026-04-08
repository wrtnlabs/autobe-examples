import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

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
        logo_image_url: true,
        created_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerProfileSnapshot.ISummary> {
    return {
      id: input.id,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      shopName: input.shop_name,
      shopDescription: input.shop_description ?? null,
      logoImageUrl: input.logo_image_url ?? null,
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
//             logo_image_url: true,
//             created_at: true,
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerProfileSnapshot.ISummary> {
//         return {
//   id: {string},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   shopName: {string},
//   shopDescription: {string | null},
//   logoImageUrl: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------