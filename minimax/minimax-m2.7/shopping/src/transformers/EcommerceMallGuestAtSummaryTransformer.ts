import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
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
  ): Promise<IEcommerceMallGuest.ISummary> {
    return {
      id: input.id,
      fingerprint: input.fingerprint,
      userAgent: input.user_agent,
    };
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
//       export async function transform(input: Payload): Promise<IEcommerceMallGuest.ISummary> {
//         return {
//   id: {string},
//   fingerprint: {string},
//   userAgent: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------