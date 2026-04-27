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
import { HrmTimeTrackingMemberAtSummaryTransformer } from "./HrmTimeTrackingMemberAtSummaryTransformer";
import { HrmTimeTrackingTimelogTransformer } from "./HrmTimeTrackingTimelogTransformer";

export namespace HrmTimeTrackingTimesheetTransformer {
  export type Payload = Prisma.hrm_time_tracking_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
        total_hours: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
        reviewer: HrmTimeTrackingMemberAtSummaryTransformer.select(),
        timelogs: HrmTimeTrackingTimelogTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingTimesheet> {
    return {
      id: input.id,
      weekStartDate: input.week_start_date.toISOString(),
      weekEndDate: input.week_end_date.toISOString(),
      status: input.status,
      totalHours: input.total_hours,
      employee: await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      reviewer: input.reviewer
        ? await HrmTimeTrackingMemberAtSummaryTransformer.transform(
            input.reviewer,
          )
        : null,
      submittedAt: input.submitted_at?.toISOString() ?? null,
      reviewedAt: input.reviewed_at?.toISOString() ?? null,
      rejectionReason: input.rejection_reason ?? null,
      timelogs: await ArrayUtil.asyncMap(
        input.timelogs,
        HrmTimeTrackingTimelogTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmTimeTrackingTimesheet;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingTimesheetTransformer {
//       export type Payload = Prisma.hrm_time_tracking_timesheetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             week_start_date: true,
//             week_end_date: true,
//             status: true,
//             total_hours: true,
//             submitted_at: true,
//             reviewed_at: true,
//             rejection_reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             employee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
//             reviewer: HrmTimeTrackingMemberAtSummaryTransformer.select(),
//             timelogs: HrmTimeTrackingTimelogTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_timesheetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingTimesheet> {
//         return {
//   id: {string},
//   weekStartDate: {string},
//   weekEndDate: {string},
//   status: {string},
//   totalHours: {number},
//   employee: await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(input.employee),
//   reviewer: input.reviewer ? await HrmTimeTrackingMemberAtSummaryTransformer.transform(input.reviewer) : null,
//   submittedAt: {string | null},
//   reviewedAt: {string | null},
//   rejectionReason: {string | null},
//   timelogs: await ArrayUtil.asyncMap(input.timelogs, HrmTimeTrackingTimelogTransformer.transform),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------