import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdministratorAtSummaryTransformer } from "./EcommerceMallAdministratorAtSummaryTransformer";

export namespace EcommerceMallUserBanAtAtTransformer {
  export type Payload = Prisma.ecommerce_mall_user_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        user_type: true,
        reason: true,
        banned_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administrator: EcommerceMallAdministratorAtSummaryTransformer.select(),
        customerBan: true,
        sellerBan: true,
      },
    } satisfies Prisma.ecommerce_mall_user_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallUserBan.IAt> {
    return {
      id: input.id,
      administrator_id: input.administrator.id,
      user_type: input.user_type,
      reason: input.reason,
      banned_at: input.banned_at.toISOString(),
      customer_id: input.customerBan?.id ?? null,
      seller_id: input.sellerBan?.id ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      administrator:
        await EcommerceMallAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
    } satisfies IEcommerceMallUserBan.IAt;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallUserBanAtAtTransformer {
//       export type Payload = Prisma.ecommerce_mall_user_bansGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             user_type: true,
//             reason: true,
//             banned_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             administrator: EcommerceMallAdministratorAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_user_bansFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallUserBan.IAt> {
//         return {
//   id: {string},
//   administrator_id: {string},
//   user_type: {string},
//   reason: {string},
//   banned_at: {string},
//   customer_id: {string | null},
//   seller_id: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   administrator: await EcommerceMallAdministratorAtSummaryTransformer.transform(input.administrator),
//         };
//       }
//     }
//--------------------------------------------------------------