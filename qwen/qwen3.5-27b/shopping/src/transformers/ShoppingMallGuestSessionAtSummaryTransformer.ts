import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallGuestSessionAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_guest_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        guest: { select: { id: true } },
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    } satisfies Prisma.shopping_mall_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallGuestSession.ISummary> {
    const now = new Date();
    const expiredAt = input.expired_at;
    const status = expiredAt > now ? "active" : "expired";
    return {
      id: input.id,
      actorType: "guest",
      actorId: input.guest.id,
      actorEmail: "",
      ip: input.ip,
      href: input.href,
      created_at: input.created_at.toISOString(),
      expired_at: expiredAt.toISOString(),
      status,
    } satisfies IShoppingMallGuestSession.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallGuestSessionAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_guest_sessionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             ip: true,
//             href: true,
//             referrer: true,
//             created_at: true,
//             expired_at: true,
//             shopping_mall_guests_id: true,
//           },
//         } satisfies Prisma.shopping_mall_guest_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallGuestSession.ISummary> {
//         return {
//   id: {string},
//   actorType: {"customer" | "seller" | "administrator" | "guest"},
//   actorId: {string},
//   actorEmail: {string},
//   ip: {string},
//   href: {string},
//   created_at: {string},
//   expired_at: {string},
//   status: {"active" | "expired"},
//         };
//       }
//     }
//--------------------------------------------------------------