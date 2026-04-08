import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmGuestSessionAtSummaryTransformer } from "./HrmGuestSessionAtSummaryTransformer";

export namespace HrmGuestTransformer {
  export type Payload = Prisma.hrm_guestsGetPayload<ReturnType<typeof select>>;
  export function select() {
    return {
      select: {
        id: true,
        device_fingerprint: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: HrmGuestSessionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_guestsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmGuest> {
    return {
      id: input.id,
      device_fingerprint: input.device_fingerprint,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      sessions: await ArrayUtil.asyncMap(
        input.sessions,
        HrmGuestSessionAtSummaryTransformer.transform,
      ),
    } satisfies IHrmGuest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmGuestTransformer {
//       export type Payload = Prisma.hrm_guestsGetPayload<ReturnType<typeof select>>;
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
//             sessions: HrmGuestSessionAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_guestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmGuest> {
//         return {
//   id: {string},
//   device_fingerprint: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   sessions: await ArrayUtil.asyncMap(input.sessions, HrmGuestSessionAtSummaryTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------