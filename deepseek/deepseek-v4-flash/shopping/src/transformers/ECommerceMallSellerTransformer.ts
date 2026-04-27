import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallSellerProfileTransformer } from "./ECommerceMallSellerProfileTransformer";

export namespace ECommerceMallSellerTransformer {
  export type Payload = Prisma.e_commerce_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        approval_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: ECommerceMallSellerProfileTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallSeller> {
    return {
      id: input.id,
      email: input.email,
      approval_status: input.approval_status,
      profile: input.profile
        ? await ECommerceMallSellerProfileTransformer.transform(input.profile)
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallSeller;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallSellerTransformer {
//       export type Payload = Prisma.e_commerce_mall_sellersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             approval_status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.e_commerce_mall_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallSeller> {
//         return {
//   id: {string},
//   email: {string},
//   approval_status: {string},
//   profile: {IECommerceMallSellerProfile | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------