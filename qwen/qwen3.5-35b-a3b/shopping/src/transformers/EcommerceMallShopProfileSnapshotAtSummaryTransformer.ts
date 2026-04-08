import { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallShopProfileSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_shop_profile_snapshotsGetPayload<
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
        shopProfile: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_shop_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShopProfileSnapshot.ISummary> {
    return {
      id: input.id,
      ecommerce_mall_shop_profile_id: input.shopProfile.id,
      shop_name: input.shop_name,
      shop_description: input.shop_description ?? null,
      logo_url: input.logo_url ?? null,
      created_at: input.created_at.toISOString(),
    } satisfies IEcommerceMallShopProfileSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallShopProfileSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_shop_profile_snapshotsGetPayload<ReturnType<typeof select>>;
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
//             ecommerce_mall_shop_profile_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_shop_profile_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShopProfileSnapshot.ISummary> {
//         return {
//   created_at: {string},
//   ecommerce_mall_shop_profile_id: {string},
//   id: {string},
//   logo_url: {string | null},
//   shop_description: {string | null},
//   shop_name: {string},
//         };
//       }
//     }
//--------------------------------------------------------------