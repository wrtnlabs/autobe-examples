import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmGuestAtSummaryTransformer } from "./HrmGuestAtSummaryTransformer";

export namespace HrmGuestSessionAtSummaryTransformer {
  export type Payload = Prisma.hrm_guest_sessionsGetPayload<
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
        guest: HrmGuestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmGuestSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      guest: await HrmGuestAtSummaryTransformer.transform(input.guest),
    } satisfies IHrmGuestSession.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmGuestSessionAtSummaryTransformer {
//       export type Payload = Prisma.hrm_guest_sessionsGetPayload<ReturnType<typeof select>>;
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
//             guest: HrmGuestAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_guest_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmGuestSession.ISummary> {
//         return {
//   id: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   created_at: {string},
//   expired_at: {string},
//   guest: await HrmGuestAtSummaryTransformer.transform(input.guest),
//         };
//       }
//     }
//--------------------------------------------------------------