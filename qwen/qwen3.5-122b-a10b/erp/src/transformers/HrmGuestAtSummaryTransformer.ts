import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmGuestAtSummaryTransformer {
  export type Payload = Prisma.hrm_guestsGetPayload<ReturnType<typeof select>>;
  export function select() {
    return {
      select: {
        id: true,
        device_fingerprint: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    } satisfies Prisma.hrm_guestsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmGuest.ISummary> {
    return {
      id: input.id,
      device_fingerprint: input.device_fingerprint,
      created_at: input.created_at.toISOString(),
      sessions_count: input._count.sessions,
    } satisfies IHrmGuest.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmGuestAtSummaryTransformer {
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
//           },
//         } satisfies Prisma.hrm_guestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmGuest.ISummary> {
//         return {
//   id: {string},
//   device_fingerprint: {string},
//   created_at: {string},
//   sessions_count: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------