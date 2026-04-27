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

export namespace ECommerceMallCustomerTransformer {
  export type Payload = Prisma.e_commerce_mall_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
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
  ): Promise<IECommerceMallCustomer> {
    if (input.profile === null) {
      throw new Error("Customer profile is missing");
    }
    return {
      id: input.id,
      email: input.email,
      profile: await ECommerceMallCustomerProfileTransformer.transform(
        input.profile,
      ),
      banned_at:
        input.banned_at !== null ? toISOStringSafe(input.banned_at) : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at !== null ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IECommerceMallCustomer;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallCustomerTransformer {
//       export type Payload = Prisma.e_commerce_mall_customersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             banned_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.e_commerce_mall_customersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallCustomer> {
//         return {
//   id: {string},
//   email: {string},
//   profile: {IECommerceMallCustomerProfile},
//   banned_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------