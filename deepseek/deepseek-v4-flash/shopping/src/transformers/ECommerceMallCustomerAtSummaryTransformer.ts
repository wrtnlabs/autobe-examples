import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallCustomerProfileTransformer } from "./ECommerceMallCustomerProfileTransformer";

export namespace ECommerceMallCustomerAtSummaryTransformer {
  export type Payload = Prisma.e_commerce_mall_customersGetPayload<
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
        banned_at: true,
        profile: ECommerceMallCustomerProfileTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallCustomer.ISummary> {
    return {
      id: input.id,
      email: input.email,
      profile: input.profile
        ? await ECommerceMallCustomerProfileTransformer.transform(input.profile)
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      banned_at: input.banned_at?.toISOString() ?? null,
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallCustomer.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallCustomerAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_customersGetPayload<ReturnType<typeof select>>;
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
//             banned_at: true,
//             profile: ECommerceMallCustomerProfileTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_customersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallCustomer.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   profile: input.profile ? await ECommerceMallCustomerProfileTransformer.transform(input.profile) : null,
//   created_at: {string},
//   updated_at: {string},
//   banned_at: {string | null},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------