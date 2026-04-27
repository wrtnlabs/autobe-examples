import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
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
import { HrmTimeTrackingTimesheetAtSummaryTransformer } from "./HrmTimeTrackingTimesheetAtSummaryTransformer";

export namespace HrmTimeTrackingTimelogTransformer {
  export type Payload = Prisma.hrm_time_tracking_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        date: true,
        duration_minutes: true,
        description: true,
        billable: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
        project: HrmTimeTrackingProjectAtSummaryTransformer.select(),
        task: HrmTimeTrackingTaskAtSummaryTransformer.select(),
        timesheet: HrmTimeTrackingTimesheetAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_timelogsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingTimelog> {
    return {
      id: input.id,
      date: input.date.toISOString(),
      durationMinutes: input.duration_minutes,
      description: input.description ?? null,
      billable: input.billable,
      employee: await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await HrmTimeTrackingProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task: input.task
        ? await HrmTimeTrackingTaskAtSummaryTransformer.transform(input.task)
        : null,
      timesheet: input.timesheet
        ? await HrmTimeTrackingTimesheetAtSummaryTransformer.transform(
            input.timesheet,
          )
        : null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmTimeTrackingTimelog;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingTimelogTransformer {
//       export type Payload = Prisma.hrm_time_tracking_timelogsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             date: true,
//             duration_minutes: true,
//             description: true,
//             billable: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             employee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
//             project: HrmTimeTrackingProjectAtSummaryTransformer.select(),
//             task: HrmTimeTrackingTaskAtSummaryTransformer.select(),
//             timesheet: HrmTimeTrackingTimesheetAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_timelogsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingTimelog> {
//         return {
//   id: {string},
//   date: {string},
//   durationMinutes: {integer},
//   description: {string | null},
//   billable: {boolean},
//   employee: await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(input.employee),
//   project: await HrmTimeTrackingProjectAtSummaryTransformer.transform(input.project),
//   task: input.task ? await HrmTimeTrackingTaskAtSummaryTransformer.transform(input.task) : null,
//   timesheet: input.timesheet ? await HrmTimeTrackingTimesheetAtSummaryTransformer.transform(input.timesheet) : null,
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------