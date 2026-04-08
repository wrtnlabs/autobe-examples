import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerProfileAtSummaryTransformer } from "./EcommerceMallCustomerProfileAtSummaryTransformer";

export namespace EcommerceMallCustomerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: EcommerceMallCustomerProfileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomer.ISummary> {
    if (!input.profile) throw new Error("Customer profile not found");
    return {
      id: input.id,
      email: input.email,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      status:
        input.deleted_at === null ? ("active" as const) : ("banned" as const),
      profile: await EcommerceMallCustomerProfileAtSummaryTransformer.transform(
        input.profile,
      ),
    } satisfies IEcommerceMallCustomer.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCustomerAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_customersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             profile: EcommerceMallCustomerProfileAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_customersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCustomer.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   status: {"active" | "banned"},
//   profile: await EcommerceMallCustomerProfileAtSummaryTransformer.transform(input.profile),
//         };
//       }
//     }
//--------------------------------------------------------------