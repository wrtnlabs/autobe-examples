import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallGuestTransformer {
  export type Payload = Prisma.ecommerce_mall_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        fingerprint: true,
        ip_address: true,
        user_agent: true,
        last_active_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_guest_sessionsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallGuest> {
    return {
      id: input.id,
      ipAddress: input.ip_address ?? undefined,
      userAgent: input.user_agent ?? undefined,
      lastActiveAt: input.last_active_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IEcommerceMallGuest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallGuestTransformer {
//       export type Payload = Prisma.ecommerce_mall_guestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             fingerprint: true,
//             ip_address: true,
//             user_agent: true,
//             last_active_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.ecommerce_mall_guestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallGuest> {
//         return {
//   id: {string},
//   ipAddress: {string | null},
//   userAgent: {string | null},
//   lastActiveAt: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------