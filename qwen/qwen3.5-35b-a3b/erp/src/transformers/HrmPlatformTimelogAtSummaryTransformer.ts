import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
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

export namespace HrmPlatformTimelogAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        start_datetime: true,
        end_datetime: true,
        duration_minutes: true,
        billable: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        project: HrmPlatformProjectAtSummaryTransformer.select(),
        task: HrmPlatformTaskAtSummaryTransformer.select(),
        timesheetTimelogs: {
          select: { id: true },
        } satisfies Prisma.hrm_platform_timesheet_timelogsFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_timelogsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTimelog.ISummary> {
    return {
      id: input.id,
      start_datetime: toISOStringSafe(input.start_datetime),
      end_datetime: toISOStringSafe(input.end_datetime),
      duration_minutes: input.duration_minutes,
      billable: input.billable,
      description: input.description ?? undefined,
      employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await HrmPlatformProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task: input.task
        ? await HrmPlatformTaskAtSummaryTransformer.transform(input.task)
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
//             start_datetime: true,
//             end_datetime: true,
//             duration_minutes: true,
//             billable: true,
//             description: true,
//             ...
//           },
//         } satisfies Prisma.hrm_platform_timelogsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformTimelog.ISummary> {
//         return {
//   id: {string},
//   start_datetime: {string},
//   end_datetime: {string},
//   duration_minutes: {integer},
//   billable: {boolean},
//   description: {string | null},
//   employee: {IHrmPlatformEmployee.ISummary},
//   project: {IHrmPlatformProject.ISummary},
//   task: {IHrmPlatformTask.ISummary | null},
//         };
//       }
//     }
//--------------------------------------------------------------