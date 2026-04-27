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
import { HrmTimeTrackingGuestSessionTransformer } from "./HrmTimeTrackingGuestSessionTransformer";

export namespace HrmTimeTrackingGuestTransformer {
  export type Payload = Prisma.hrm_time_tracking_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        device_fingerprint: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: HrmTimeTrackingGuestSessionTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingGuest> {
    return {
      id: input.id,
      device_fingerprint: input.device_fingerprint,
      sessions: await ArrayUtil.asyncMap(
        input.sessions,
        HrmTimeTrackingGuestSessionTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmTimeTrackingGuest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingGuestTransformer {
//       export type Payload = Prisma.hrm_time_tracking_guestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             device_fingerprint: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             sessions: HrmTimeTrackingGuestSessionTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_guestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingGuest> {
//         return {
//   id: {string},
//   device_fingerprint: {string},
//   sessions: await ArrayUtil.asyncMap(input.sessions, HrmTimeTrackingGuestSessionTransformer.transform),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------