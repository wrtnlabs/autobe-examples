import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdministratorAtSummaryTransformer } from "./EcommerceMallAdministratorAtSummaryTransformer";
import { EcommerceMallUserBanOfCustomerAtSummaryTransformer } from "./EcommerceMallUserBanOfCustomerAtSummaryTransformer";
import { EcommerceMallUserBanOfSellerAtSummaryTransformer } from "./EcommerceMallUserBanOfSellerAtSummaryTransformer";

export namespace EcommerceMallUserBanTransformer {
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
        customerBan:
          EcommerceMallUserBanOfCustomerAtSummaryTransformer.select(),
        sellerBan: EcommerceMallUserBanOfSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_user_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallUserBan> {
    return {
      id: input.id,
      administrator:
        await EcommerceMallAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
      user_type: input.user_type as "customer" | "seller",
      customerBan: input.customerBan
        ? await EcommerceMallUserBanOfCustomerAtSummaryTransformer.transform(
            input.customerBan,
          )
        : typia.assert<IEcommerceMallUserBanOfCustomer.ISummary>(null!),
      sellerBan: input.sellerBan
        ? await EcommerceMallUserBanOfSellerAtSummaryTransformer.transform(
            input.sellerBan,
          )
        : typia.assert<IEcommerceMallUserBanOfSeller.ISummary>(null!),
      reason: input.reason,
      banned_at: toISOStringSafe(input.banned_at),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IEcommerceMallUserBan;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallUserBanTransformer {
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
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_user_bansFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallUserBan> {
//         return {
//   id: {string},
//   administrator: {IEcommerceMallAdministrator.ISummary},
//   user_type: {"customer" | "seller"},
//   customerBan: {IEcommerceMallUserBanOfCustomer.ISummary},
//   sellerBan: {IEcommerceMallUserBanOfSeller.ISummary},
//   reason: {string},
//   banned_at: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------