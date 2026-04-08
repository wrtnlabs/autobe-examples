import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallUserBanAtSummaryTransformer } from "./EcommerceMallUserBanAtSummaryTransformer";

export namespace EcommerceMallUserBanOfSellerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_user_ban_of_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ban: EcommerceMallUserBanAtSummaryTransformer.select(),
        seller: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_user_ban_of_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallUserBanOfSeller.ISummary> {
    return {
      id: input.id,
      ban: await EcommerceMallUserBanAtSummaryTransformer.transform(input.ban),
      seller: {
        id: input.seller.id,
        email: input.seller.email,
        display_name: input.seller.display_name,
        phone_number: null,
        created_at: toISOStringSafe(input.seller.created_at),
        updated_at: toISOStringSafe(input.seller.updated_at),
        deleted_at:
          input.seller.deleted_at !== null
            ? toISOStringSafe(input.seller.deleted_at)
            : null,
      } satisfies IEcommerceMallMember.ISummary,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at !== null ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IEcommerceMallUserBanOfSeller.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallUserBanOfSellerAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_user_ban_of_sellersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ban: EcommerceMallUserBanAtSummaryTransformer.select(),
//             seller_id: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_user_ban_of_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallUserBanOfSeller.ISummary> {
//         return {
//   id: {string},
//   ban: await EcommerceMallUserBanAtSummaryTransformer.transform(input.ban),
//   seller: {IEcommerceMallMember.ISummary},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------