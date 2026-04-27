import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallSellerAtSummaryTransformer } from "./ECommerceMallSellerAtSummaryTransformer";

export namespace ECommerceMallSellerProfileTransformer {
  export type Payload = Prisma.e_commerce_mall_seller_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        logo_image: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: ECommerceMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_seller_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallSellerProfile> {
    return {
      id: input.id,
      seller: await ECommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      shopName: input.shop_name,
      shopDescription: input.shop_description ?? null,
      logoImage: input.logo_image ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallSellerProfile;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallSellerProfileTransformer {
//       export type Payload = Prisma.e_commerce_mall_seller_profilesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             shop_name: true,
//             shop_description: true,
//             logo_image: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller: ECommerceMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_seller_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallSellerProfile> {
//         return {
//   id: {string},
//   seller: await ECommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   shopName: {string},
//   shopDescription: {string | null},
//   logoImage: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------