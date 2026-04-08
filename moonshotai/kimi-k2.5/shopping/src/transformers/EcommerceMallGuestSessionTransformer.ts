import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallGuestSessionTransformer {
  export type Payload = Prisma.ecommerce_mall_guest_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        ecommerceMallGuest: {
          select: {
            id: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_guestsDefaultArgs,
      },
    } satisfies Prisma.ecommerce_mall_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallGuestSession> {
    const expiresAt = input.expired_at.toISOString();
    const status: "active" | "expired" =
      new Date(expiresAt).getTime() > Date.now() ? "active" : "expired";
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      createdAt: input.created_at.toISOString(),
      expiredAt: expiresAt,
      guest: {
        id: input.ecommerceMallGuest.id,
        createdAt: input.ecommerceMallGuest.created_at.toISOString(),
        expiresAt,
        status,
      } satisfies IEcommerceMallGuest.ISummary,
    } satisfies IEcommerceMallGuestSession;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallGuestSessionTransformer {
//       export type Payload = Prisma.ecommerce_mall_guest_sessionsGetPayload<ReturnType<typeof select>>;
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
//             ecommerceMallGuest: EcommerceMallGuestAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_guest_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallGuestSession> {
//         return {
//   id: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   createdAt: {string},
//   expiredAt: {string},
//   guest: await EcommerceMallGuestAtSummaryTransformer.transform(input.ecommerceMallGuest),
//         };
//       }
//     }
//--------------------------------------------------------------