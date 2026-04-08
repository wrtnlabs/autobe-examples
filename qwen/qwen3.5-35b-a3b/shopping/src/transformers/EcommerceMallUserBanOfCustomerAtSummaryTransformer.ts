import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallMemberAtSummaryTransformer } from "./EcommerceMallMemberAtSummaryTransformer";
import { EcommerceMallUserBanAtSummaryTransformer } from "./EcommerceMallUserBanAtSummaryTransformer";

export namespace EcommerceMallUserBanOfCustomerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_user_ban_of_customersGetPayload<
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
        customer: EcommerceMallMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_user_ban_of_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallUserBanOfCustomer.ISummary> {
    return {
      id: input.id,
      ban: await EcommerceMallUserBanAtSummaryTransformer.transform(input.ban),
      customer: await EcommerceMallMemberAtSummaryTransformer.transform(
        input.customer,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallUserBanOfCustomer.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallUserBanOfCustomerAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_user_ban_of_customersGetPayload<ReturnType<typeof select>>;
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
//             customer: EcommerceMallMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_user_ban_of_customersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallUserBanOfCustomer.ISummary> {
//         return {
//   id: {string},
//   ban: await EcommerceMallUserBanAtSummaryTransformer.transform(input.ban),
//   customer: await EcommerceMallMemberAtSummaryTransformer.transform(input.customer),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------