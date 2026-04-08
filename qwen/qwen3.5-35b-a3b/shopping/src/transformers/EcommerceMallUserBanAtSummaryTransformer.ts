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

export namespace EcommerceMallUserBanAtSummaryTransformer {
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
  ): Promise<IEcommerceMallUserBan.ISummary> {
    return {
      id: input.id,
      user_type: typia.assert<"customer" | "seller">(input.user_type),
      reason: input.reason,
      banned_at: toISOStringSafe(input.banned_at),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      ban_status: input.deleted_at === null ? "active" : "completed",
      administrator:
        await EcommerceMallAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
    } satisfies IEcommerceMallUserBan.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallUserBanAtSummaryTransformer {
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
//             ban_status: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_user_bansFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallUserBan.ISummary> {
//         return {
//   id: {string},
//   user_type: {"customer" | "seller"},
//   reason: {string},
//   banned_at: {string},
//   created_at: {string},
//   updated_at: {string},
//   ban_status: {"active" | "completed"},
//   administrator: {IEcommerceMallAdministrator.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------