import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformProjectAtSummaryTransformer } from "./HrmPlatformProjectAtSummaryTransformer";
import { HrmPlatformTaskAtSummaryTransformer } from "./HrmPlatformTaskAtSummaryTransformer";

export namespace HrmPlatformTimerAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_timersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        last_tick_at: true,
        duration_seconds: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: true,
        project: HrmPlatformProjectAtSummaryTransformer.select(),
        task: HrmPlatformTaskAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_timersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTimer.ISummary> {
    return {
      id: input.id,
      status: input.status,
      lastTickAt: toISOStringSafe(input.last_tick_at),
      durationSeconds: Number(input.duration_seconds),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt:
        input.deleted_at !== null && input.deleted_at !== undefined
          ? toISOStringSafe(input.deleted_at)
          : null,
      project: input.project
        ? await HrmPlatformProjectAtSummaryTransformer.transform(input.project)
        : null,
      task: input.task
        ? await HrmPlatformTaskAtSummaryTransformer.transform(input.task)
        : null,
    } satisfies IHrmPlatformTimer.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformTimerAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_timersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             last_tick_at: true,
//             duration_seconds: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             hrm_platform_employee_id: true,
//             project: HrmPlatformProjectAtSummaryTransformer.select(),
//             task: HrmPlatformTaskAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_timersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformTimer.ISummary> {
//         return {
//   id: {string},
//   status: {string},
//   lastTickAt: {string},
//   durationSeconds: {integer},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   project: input.project ? await HrmPlatformProjectAtSummaryTransformer.transform(input.project) : null,
//   task: input.task ? await HrmPlatformTaskAtSummaryTransformer.transform(input.task) : null,
//         };
//       }
//     }
//--------------------------------------------------------------