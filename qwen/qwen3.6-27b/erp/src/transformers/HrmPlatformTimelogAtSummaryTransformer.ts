import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformEmployeeAtSummaryTransformer } from "./HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformProjectAtSummaryTransformer } from "./HrmPlatformProjectAtSummaryTransformer";
import { HrmPlatformTaskAtSummaryTransformer } from "./HrmPlatformTaskAtSummaryTransformer";
import { HrmPlatformTimesheetAtSummaryTransformer } from "./HrmPlatformTimesheetAtSummaryTransformer";

export namespace HrmPlatformTimelogAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        date: true,
        duration_minutes: true,
        work_description: true,
        billable: true,
        employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        project: HrmPlatformProjectAtSummaryTransformer.select(),
        task: HrmPlatformTaskAtSummaryTransformer.select(),
        timesheet: HrmPlatformTimesheetAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_timelogsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTimelog.ISummary> {
    return {
      id: input.id,
      date: input.date.toISOString(),
      duration_minutes: input.duration_minutes,
      work_description: input.work_description ?? null,
      billable: input.billable,
      employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await HrmPlatformProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task: input.task
        ? await HrmPlatformTaskAtSummaryTransformer.transform(input.task)
        : null,
      timesheet: input.timesheet
        ? await HrmPlatformTimesheetAtSummaryTransformer.transform(
            input.timesheet,
          )
        : null,
    } satisfies IHrmPlatformTimelog.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformTimelogAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_timelogsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             date: true,
//             duration_minutes: true,
//             work_description: true,
//             billable: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
//             project: HrmPlatformProjectAtSummaryTransformer.select(),
//             task: HrmPlatformTaskAtSummaryTransformer.select(),
//             timesheet: HrmPlatformTimesheetAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_timelogsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformTimelog.ISummary> {
//         return {
//   id: {string},
//   date: {string},
//   duration_minutes: {integer},
//   work_description: {string | null},
//   billable: {boolean},
//   employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(input.employee),
//   project: await HrmPlatformProjectAtSummaryTransformer.transform(input.project),
//   task: input.task ? await HrmPlatformTaskAtSummaryTransformer.transform(input.task) : null,
//   timesheet: input.timesheet ? await HrmPlatformTimesheetAtSummaryTransformer.transform(input.timesheet) : null,
//         };
//       }
//     }
//--------------------------------------------------------------