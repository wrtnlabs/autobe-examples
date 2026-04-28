import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformSellerProfileAtSummaryTransformer } from "./EcommercePlatformSellerProfileAtSummaryTransformer";
import { EcommercePlatformSnapshotAtSummaryTransformer } from "./EcommercePlatformSnapshotAtSummaryTransformer";

export namespace EcommercePlatformSnapshotSellerProfileAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_platform_snapshot_seller_profilesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        previous_shop_name: true,
        current_shop_name: true,
        previous_shop_description: true,
        current_shop_description: true,
        previous_logo_uri: true,
        current_logo_uri: true,
        created_at: true,
        ecommercePlatformSnapshots:
          EcommercePlatformSnapshotAtSummaryTransformer.select(),
        ecommercePlatformSellerProfiles:
          EcommercePlatformSellerProfileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_snapshot_seller_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformSnapshotSellerProfile.ISummary> {
    return {
      id: input.id,
      previousShopName: input.previous_shop_name,
      currentShopName: input.current_shop_name,
      previousShopDescription: input.previous_shop_description,
      currentShopDescription: input.current_shop_description,
      previousLogoUri: input.previous_logo_uri,
      currentLogoUri: input.current_logo_uri,
      created_at: input.created_at.toISOString(),
      snapshot: await EcommercePlatformSnapshotAtSummaryTransformer.transform(
        input.ecommercePlatformSnapshots,
      ),
      sellerProfile:
        await EcommercePlatformSellerProfileAtSummaryTransformer.transform(
          input.ecommercePlatformSellerProfiles,
        ),
    } satisfies IEcommercePlatformSnapshotSellerProfile.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformSnapshotSellerProfileAtSummaryTransformer {
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
//             ecommercePlatformSnapshots: EcommercePlatformSnapshotAtSummaryTransformer.select(),
//             ecommercePlatformSellerProfiles: EcommercePlatformSellerProfileAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_snapshot_seller_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformSnapshotSellerProfile.ISummary> {
//         return {
//   id: {string},
//   previousShopName: {string | null},
//   currentShopName: {string | null},
//   previousShopDescription: {string | null},
//   currentShopDescription: {string | null},
//   previousLogoUri: {string | null},
//   currentLogoUri: {string | null},
//   created_at: {string},
//   snapshot: await EcommercePlatformSnapshotAtSummaryTransformer.transform(input.ecommercePlatformSnapshots),
//   sellerProfile: await EcommercePlatformSellerProfileAtSummaryTransformer.transform(input.ecommercePlatformSellerProfiles),
//         };
//       }
//     }
//--------------------------------------------------------------