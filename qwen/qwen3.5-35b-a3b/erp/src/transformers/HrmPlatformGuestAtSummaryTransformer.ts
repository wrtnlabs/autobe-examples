import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformGuestAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        device_identifier: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
      },
    } satisfies Prisma.hrm_platform_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformGuest.ISummary> {
    return {
      id: input.id,
      device_identifier: input.device_identifier,
      ip_address: input.ip_address ?? undefined,
      created_at: input.created_at.toISOString(),
    } satisfies IHrmPlatformGuest.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformGuestAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_guestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             device_identifier: true,
//             ip_address: true,
//             user_agent: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.hrm_platform_guestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformGuest.ISummary> {
//         return {
//   id: {string},
//   device_identifier: {string},
//   ip_address: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------