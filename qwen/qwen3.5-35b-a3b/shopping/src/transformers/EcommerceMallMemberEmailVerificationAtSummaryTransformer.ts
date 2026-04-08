import { IEcommerceMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallMemberEmailVerificationAtSummaryTransformer {
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
  ): Promise<IEcommerceMallMemberEmailVerification.ISummary> {
    return {
      id: input.id,
      email: input.email,
      status: typia.assert<"pending" | "used" | "expired" | "archived">(
        input.status,
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      expired_at: toISOStringSafe(input.expired_at),
      used_at: input.used_at ? toISOStringSafe(input.used_at) : null,
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IEcommerceMallMemberEmailVerification.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallMemberEmailVerificationAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_member_email_verificationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             expired_at: true,
//             used_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.ecommerce_mall_member_email_verificationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallMemberEmailVerification.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   status: {"pending" | "used" | "expired" | "archived"},
//   created_at: {string},
//   updated_at: {string},
//   expired_at: {string},
//   used_at: {string | null},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------