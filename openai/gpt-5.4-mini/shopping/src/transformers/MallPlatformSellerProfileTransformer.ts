import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformSellerAtSummaryTransformer } from "./MallPlatformSellerAtSummaryTransformer";

export namespace MallPlatformSellerProfileTransformer {
  export type Payload = Prisma.mall_platform_seller_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        logo_image_uri: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sellerAccount: MallPlatformSellerAtSummaryTransformer.select(),
        sellerProfileSnapshots: true,
      },
    } satisfies Prisma.mall_platform_seller_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformSellerProfile> {
    return {
      id: input.id,
      sellerAccount: await MallPlatformSellerAtSummaryTransformer.transform(
        input.sellerAccount,
      ),
      shopName: input.shop_name,
      shopDescription: input.shop_description,
      logoImageUri: input.logo_image_uri ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformSellerProfile;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformSellerProfileTransformer {
//       export type Payload = Prisma.mall_platform_seller_profilesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             shop_name: true,
//             shop_description: true,
//             logo_image_uri: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller_account_id: true,
//             ...
//           },
//         } satisfies Prisma.mall_platform_seller_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformSellerProfile> {
//         return {
//   id: {string},
//   sellerAccount: {IMallPlatformSeller.ISummary},
//   shopName: {string},
//   shopDescription: {string},
//   logoImageUri: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------