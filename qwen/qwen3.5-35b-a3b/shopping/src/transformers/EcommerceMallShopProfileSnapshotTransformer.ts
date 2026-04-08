import { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallShopProfileAtSummaryTransformer } from "./EcommerceMallShopProfileAtSummaryTransformer";

export namespace EcommerceMallShopProfileSnapshotTransformer {
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
        shopProfile: EcommerceMallShopProfileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_shop_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShopProfileSnapshot> {
    return {
      id: input.id,
      shop_name: input.shop_name,
      shop_description: input.shop_description,
      logo_url: input.logo_url ?? null,
      created_at: input.created_at.toISOString(),
      shopProfile: await EcommerceMallShopProfileAtSummaryTransformer.transform(
        input.shopProfile,
      ),
    } satisfies IEcommerceMallShopProfileSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallShopProfileSnapshotTransformer {
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
//             shopProfile: EcommerceMallShopProfileAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_shop_profile_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShopProfileSnapshot> {
//         return {
//   id: {string},
//   shop_name: {string},
//   shop_description: {string},
//   logo_url: {string | null},
//   created_at: {string},
//   shopProfile: await EcommerceMallShopProfileAtSummaryTransformer.transform(input.shopProfile),
//         };
//       }
//     }
//--------------------------------------------------------------