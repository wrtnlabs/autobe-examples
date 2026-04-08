import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallGuestAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: {
          select: {
            expired_at: true,
          },
          orderBy: {
            created_at: "desc",
          },
          take: 1,
        } satisfies Prisma.ecommerce_mall_guest_sessionsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallGuest.ISummary> {
    const latestSession = input.sessions[0];
    const expiresAt = latestSession
      ? latestSession.expired_at.toISOString()
      : new Date().toISOString();
    const status: "active" | "expired" =
      new Date(expiresAt).getTime() > Date.now() ? "active" : "expired";
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      expiresAt,
      status,
    } satisfies IEcommerceMallGuest.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallGuestAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_guestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.ecommerce_mall_guestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallGuest.ISummary> {
//         return {
//   id: {string},
//   createdAt: {string},
//   expiresAt: {string},
//   status: {"active" | "expired"},
//         };
//       }
//     }
//--------------------------------------------------------------