import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformSellerAtSummaryTransformer } from "./EcommercePlatformSellerAtSummaryTransformer";

export namespace EcommercePlatformSnapshotSellerProfileTransformer {
  export type Payload =
    Prisma.ecommerce_platform_snapshot_seller_profilesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        ecommercePlatformSnapshots: {
          select: {
            id: true,
            entity_type: true,
            created_at: true,
          },
        },
        ecommercePlatformSellerProfiles: {
          select: {
            id: true,
            seller: EcommercePlatformSellerAtSummaryTransformer.select(),
          },
        },
        previous_shop_name: true,
        current_shop_name: true,
        previous_shop_description: true,
        current_shop_description: true,
        previous_logo_uri: true,
        current_logo_uri: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_platform_snapshot_seller_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformSnapshotSellerProfile> {
    return {
      id: input.ecommercePlatformSnapshots.id,
      entityType: input.ecommercePlatformSnapshots.entity_type,
      snapshotCreatedAt:
        input.ecommercePlatformSnapshots.created_at.toISOString(),
      sellerProfileId: input.ecommercePlatformSellerProfiles.id,
      seller: await EcommercePlatformSellerAtSummaryTransformer.transform(
        input.ecommercePlatformSellerProfiles.seller,
      ),
      previousShopName: input.previous_shop_name ?? null,
      currentShopName: input.current_shop_name ?? null,
      previousShopDescription: input.previous_shop_description ?? null,
      currentShopDescription: input.current_shop_description ?? null,
      previousLogoUri: input.previous_logo_uri ?? null,
      currentLogoUri: input.current_logo_uri ?? null,
      createdAt: input.created_at.toISOString(),
    } satisfies IEcommercePlatformSnapshotSellerProfile;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformSnapshotSellerProfileTransformer {
//       export type Payload = Prisma.ecommerce_platform_snapshot_seller_profilesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             previous_shop_name: true,
//             current_shop_name: true,
//             previous_shop_description: true,
//             current_shop_description: true,
//             previous_logo_uri: true,
//             current_logo_uri: true,
//             created_at: true,
//             ecommerce_platform_snapshots_id: true,
//             ecommerce_platform_seller_profiles_id: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_platform_snapshot_seller_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformSnapshotSellerProfile> {
//         return {
//   id: {string},
//   entityType: {string},
//   snapshotCreatedAt: {string},
//   sellerProfileId: {string},
//   seller: {IEcommercePlatformSeller.ISummary},
//   previousShopName: {string | null},
//   currentShopName: {string | null},
//   previousShopDescription: {string | null},
//   currentShopDescription: {string | null},
//   previousLogoUri: {string | null},
//   currentLogoUri: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------