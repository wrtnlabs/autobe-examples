import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformSellerProfileSnapshotTransformer {
  export type Payload = Prisma.mall_platform_seller_profile_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformSellerProfileSnapshot> {
    return {
      id: input.id,
      sellerProfile: input.sellerProfile as IMallPlatformSellerProfile.ISummary,
      shopName: input.shop_name,
      shopDescription: input.shop_description,
      logoImageUri: input.logo_image_uri,
      createdAt: input.created_at.toISOString(),
    } satisfies IMallPlatformSellerProfileSnapshot;
  }
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        logo_image_uri: true,
        created_at: true,
        sellerProfile: true,
      },
    } satisfies Prisma.mall_platform_seller_profile_snapshotsFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformSellerProfileSnapshotTransformer {
//       export type Payload = Prisma.mall_platform_seller_profile_snapshotsGetPayload<ReturnType<typeof select>>;
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
//             seller_profile_id: true,
//             ...
//           },
//         } satisfies Prisma.mall_platform_seller_profile_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformSellerProfileSnapshot> {
//         return {
//   id: {string},
//   sellerProfile: {IMallPlatformSellerProfile.ISummary},
//   shopName: {string},
//   shopDescription: {string},
//   logoImageUri: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------