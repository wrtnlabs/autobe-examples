import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformContractAtSummaryTransformer } from "./HrmPlatformContractAtSummaryTransformer";
import { HrmPlatformDepartmentAtSummaryTransformer } from "./HrmPlatformDepartmentAtSummaryTransformer";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";
import { HrmPlatformProjectMembershipAtSummaryTransformer } from "./HrmPlatformProjectMembershipAtSummaryTransformer";
import { HrmPlatformRoleAtSummaryTransformer } from "./HrmPlatformRoleAtSummaryTransformer";
import { HrmPlatformTaskAtSummaryTransformer } from "./HrmPlatformTaskAtSummaryTransformer";
import { HrmPlatformTimelogAtSummaryTransformer } from "./HrmPlatformTimelogAtSummaryTransformer";
import { HrmPlatformTimerAtSummaryTransformer } from "./HrmPlatformTimerAtSummaryTransformer";
import { HrmPlatformTimesheetAtSummaryTransformer } from "./HrmPlatformTimesheetAtSummaryTransformer";

export namespace HrmPlatformEmployeeTransformer {
  export type Payload = Prisma.hrm_platform_employeesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        employee_code: true,
        display_name: true,
        email: true,
        phone_number: true,
        job_title: true,
        job_level: true,
        employment_type: true,
        start_date: true,
        end_date: true,
        status: true,
        is_pending: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        member: HrmPlatformMemberAtSummaryTransformer.select(),
        role: HrmPlatformRoleAtSummaryTransformer.select(),
        department: HrmPlatformDepartmentAtSummaryTransformer.select(),
        snapshots: { select: { id: true, created_at: true } },
        contracts: HrmPlatformContractAtSummaryTransformer.select(),
        projectMemberships:
          HrmPlatformProjectMembershipAtSummaryTransformer.select(),
        assignedTasks: HrmPlatformTaskAtSummaryTransformer.select(),
        timers: HrmPlatformTimerAtSummaryTransformer.select(),
        timelogs: HrmPlatformTimelogAtSummaryTransformer.select(),
        timesheets: HrmPlatformTimesheetAtSummaryTransformer.select(),
        timesheetWeeklyStats: { select: { id: true, week_start: true } },
      },
    } satisfies Prisma.hrm_platform_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformEmployee> {
    return {
      id: input.id,
      employee_code: input.employee_code,
      display_name: input.display_name,
      email: input.email,
      phone_number: input.phone_number ?? null,
      job_title: input.job_title ?? null,
      job_level: input.job_level,
      employment_type: input.employment_type,
      start_date: toISOStringSafe(input.start_date),
      end_date: input.end_date ? toISOStringSafe(input.end_date) : null,
      status: input.status,
      is_pending: input.is_pending,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      member: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      role: await HrmPlatformRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await HrmPlatformDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
      contracts: await ArrayUtil.asyncMap(
        input.contracts,
        HrmPlatformContractAtSummaryTransformer.transform,
      ),
      projectMemberships: await ArrayUtil.asyncMap(
        input.projectMemberships,
        HrmPlatformProjectMembershipAtSummaryTransformer.transform,
      ),
      assignedTasks: await ArrayUtil.asyncMap(input.assignedTasks, (task) =>
        HrmPlatformTaskAtSummaryTransformer.transform(task),
      ),
      timers: await ArrayUtil.asyncMap(
        input.timers,
        HrmPlatformTimerAtSummaryTransformer.transform,
      ),
      timelogs: await ArrayUtil.asyncMap(
        input.timelogs,
        HrmPlatformTimelogAtSummaryTransformer.transform,
      ),
      timesheets: await ArrayUtil.asyncMap(
        input.timesheets,
        HrmPlatformTimesheetAtSummaryTransformer.transform,
      ),
    } satisfies IHrmPlatformEmployee;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformEmployeeTransformer {
//       export type Payload = Prisma.hrm_platform_employeesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             employee_code: true,
//             display_name: true,
//             email: true,
//             phone_number: true,
//             job_title: true,
//             job_level: true,
//             employment_type: true,
//             start_date: true,
//             end_date: true,
//             status: true,
//             is_pending: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.hrm_platform_employeesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformEmployee> {
//         return {
//   id: {string},
//   employee_code: {string},
//   display_name: {string},
//   email: {string},
//   phone_number: {string | null},
//   job_title: {string | null},
//   job_level: {string},
//   employment_type: {string},
//   start_date: {string},
//   end_date: {string | null},
//   status: {string},
//   is_pending: {boolean},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   organization: {IHrmPlatformOrganization.ISummary},
//   member: {IHrmPlatformMember.ISummary},
//   role: {IHrmPlatformRole.ISummary},
//   department: {IHrmPlatformDepartment.ISummary | null},
//   contracts: {Array<IHrmPlatformContract.ISummary>},
//   projectMemberships: {Array<IHrmPlatformProjectMembership.ISummary>},
//   assignedTasks: {Array<IHrmPlatformTask.ISummary>},
//   timers: {Array<IHrmPlatformTimer.ISummary>},
//   timelogs: {Array<IHrmPlatformTimelog.ISummary>},
//   timesheets: {Array<IHrmPlatformTimesheet.ISummary>},
//         };
//       }
//     }
//--------------------------------------------------------------