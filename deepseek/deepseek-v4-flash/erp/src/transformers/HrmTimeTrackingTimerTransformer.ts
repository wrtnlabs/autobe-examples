import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingEmployeeAtSummaryTransformer } from "./HrmTimeTrackingEmployeeAtSummaryTransformer";
import { HrmTimeTrackingProjectAtSummaryTransformer } from "./HrmTimeTrackingProjectAtSummaryTransformer";
import { HrmTimeTrackingTaskAtSummaryTransformer } from "./HrmTimeTrackingTaskAtSummaryTransformer";

export namespace HrmTimeTrackingTimerTransformer {
  export type Payload = Prisma.hrm_time_tracking_timersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        description: true,
        started_at: true,
        stopped_at: true,
        status: true,
        created_at: true,
        updated_at: true,
        employee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
        project: HrmTimeTrackingProjectAtSummaryTransformer.select(),
        task: HrmTimeTrackingTaskAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_timersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingTimer> {
    return {
      id: input.id,
      employee: await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await HrmTimeTrackingProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task: input.task
        ? await HrmTimeTrackingTaskAtSummaryTransformer.transform(input.task)
        : null,
      description: input.description ?? null,
      started_at: input.started_at.toISOString(),
      stopped_at: input.stopped_at?.toISOString() ?? null,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IHrmTimeTrackingTimer;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingTimerTransformer {
//       export type Payload = Prisma.hrm_time_tracking_timersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             description: true,
//             started_at: true,
//             stopped_at: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             employee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
//             project: HrmTimeTrackingProjectAtSummaryTransformer.select(),
//             task: HrmTimeTrackingTaskAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_timersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingTimer> {
//         return {
//   id: {string},
//   employee: await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(input.employee),
//   project: await HrmTimeTrackingProjectAtSummaryTransformer.transform(input.project),
//   task: input.task ? await HrmTimeTrackingTaskAtSummaryTransformer.transform(input.task) : null,
//   description: {string | null},
//   started_at: {string},
//   stopped_at: {string | null},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------