import { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallShopProfileAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_shop_profilesGetPayload<
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
        updated_at: true,
        deleted_at: true,
        seller: { select: { id: true } },
        profileSnapshots: { select: { id: true } },
        snapshots: { select: { id: true } },
      },
    } satisfies Prisma.ecommerce_mall_shop_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShopProfile.ISummary> {
    return {
      id: input.id,
      shop_name: input.shop_name,
      shop_description: input.shop_description ?? null,
      logo_url: input.logo_url ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallShopProfile.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallShopProfileAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_shop_profilesGetPayload<ReturnType<typeof select>>;
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
//             updated_at: true,
//             deleted_at: true,
//             seller_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_shop_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShopProfile.ISummary> {
//         return {
//   id: {string},
//   shop_name: {string},
//   shop_description: {string | null},
//   logo_url: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------