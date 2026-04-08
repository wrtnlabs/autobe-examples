import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallMemberAtSummaryTransformer } from "./EcommerceMallMemberAtSummaryTransformer";

export namespace EcommerceMallMemberPasswordResetTransformer {
  export type Payload = Prisma.ecommerce_mall_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        token: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: EcommerceMallMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallMemberPasswordReset> {
    return {
      id: input.id,
      email: input.email,
      token: input.token ?? undefined,
      expires_at: input.expires_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      member: await EcommerceMallMemberAtSummaryTransformer.transform(
        input.member,
      ),
    } satisfies IEcommerceMallMemberPasswordReset;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallMemberPasswordResetTransformer {
//       export type Payload = Prisma.ecommerce_mall_member_password_resetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             token: true,
//             expires_at: true,
//             used_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: EcommerceMallMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_member_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallMemberPasswordReset> {
//         return {
//   id: {string},
//   email: {string},
//   token: {string},
//   expires_at: {string},
//   used_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   member: await EcommerceMallMemberAtSummaryTransformer.transform(input.member),
//         };
//       }
//     }
//--------------------------------------------------------------