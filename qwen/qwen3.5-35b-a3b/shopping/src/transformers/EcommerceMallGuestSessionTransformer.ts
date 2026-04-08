import { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallGuestSessionTransformer {
  export type Payload = Prisma.ecommerce_mall_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        expired_at: true,
        member: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_membersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallGuestSession> {
    return {
      id: input.id,
      actor_id: input.member.id,
      actor_type: "member",
      ip: input.ip,
      href: input.href ?? null,
      referrer: input.referrer ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString() ?? null,
      expired_at: input.expired_at.toISOString(),
    } satisfies IEcommerceMallGuestSession;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallGuestSessionTransformer {
//       export type Payload = Prisma.ecommerce_mall_member_sessionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             access_token: true,
//             refresh_token: true,
//             ip: true,
//             href: true,
//             referrer: true,
//             created_at: true,
//             updated_at: true,
//             expired_at: true,
//             ecommerce_mall_member_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_member_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallGuestSession> {
//         return {
//   id: {string},
//   actor_id: {string | null},
//   actor_type: {"member" | "seller" | "administrator" | "super_administrator" | "guest"},
//   ip: {string},
//   href: {string | null},
//   referrer: {string | null},
//   created_at: {string},
//   updated_at: {string | null},
//   expired_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------