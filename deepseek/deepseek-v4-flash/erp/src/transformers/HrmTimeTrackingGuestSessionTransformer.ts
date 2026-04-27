import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import { IHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingGuestAtSummaryTransformer } from "./HrmTimeTrackingGuestAtSummaryTransformer";

export namespace HrmTimeTrackingGuestSessionTransformer {
  export type Payload = Prisma.hrm_time_tracking_guest_sessionsGetPayload<
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
        guest: HrmTimeTrackingGuestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingGuestSession> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      guest: await HrmTimeTrackingGuestAtSummaryTransformer.transform(
        input.guest,
      ),
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    } satisfies IHrmTimeTrackingGuestSession;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingGuestSessionTransformer {
//       export type Payload = Prisma.hrm_time_tracking_guest_sessionsGetPayload<ReturnType<typeof select>>;
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
//             guest: HrmTimeTrackingGuestAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_guest_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingGuestSession> {
//         return {
//   id: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   guest: await HrmTimeTrackingGuestAtSummaryTransformer.transform(input.guest),
//   created_at: {string},
//   expired_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------