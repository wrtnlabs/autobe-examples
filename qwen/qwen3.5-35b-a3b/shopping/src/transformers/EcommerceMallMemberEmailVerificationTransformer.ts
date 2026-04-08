import { IEcommerceMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallMemberEmailVerificationTransformer {
  export type Payload =
    Prisma.ecommerce_mall_member_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        email: true,
        status: true,
        created_at: true,
        updated_at: true,
        used_at: true,
        expired_at: true,
        deleted_at: true,
        member: true,
      },
    } satisfies Prisma.ecommerce_mall_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallMemberEmailVerification> {
    return {
      id: input.id,
      token: input.token,
      email: input.email,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      expired_at: input.expired_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      ecommerce_mall_member_id: input.member.id,
    } satisfies IEcommerceMallMemberEmailVerification;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallMemberEmailVerificationTransformer {
//       export type Payload = Prisma.ecommerce_mall_member_email_verificationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             email: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             used_at: true,
//             expired_at: true,
//             deleted_at: true,
//             ecommerce_mall_member_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_member_email_verificationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallMemberEmailVerification> {
//         return {
//   id: {string},
//   token: {string},
//   email: {string},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//   used_at: {string | null},
//   expired_at: {string},
//   deleted_at: {string | null},
//   ecommerce_mall_member_id: {string},
//         };
//       }
//     }
//--------------------------------------------------------------