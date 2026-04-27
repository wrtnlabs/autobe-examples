import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingDepartmentAtSummaryTransformer } from "./HrmTimeTrackingDepartmentAtSummaryTransformer";
import { HrmTimeTrackingEmployeeContractTransformer } from "./HrmTimeTrackingEmployeeContractTransformer";
import { HrmTimeTrackingMemberAtSummaryTransformer } from "./HrmTimeTrackingMemberAtSummaryTransformer";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";
import { HrmTimeTrackingProjectMemberAtSummaryTransformer } from "./HrmTimeTrackingProjectMemberAtSummaryTransformer";
import { HrmTimeTrackingRoleAtSummaryTransformer } from "./HrmTimeTrackingRoleAtSummaryTransformer";

export namespace HrmTimeTrackingEmployeeTransformer {
  export type Payload = Prisma.hrm_time_tracking_employeesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        position: true,
        employment_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        member: HrmTimeTrackingMemberAtSummaryTransformer.select(),
        role: HrmTimeTrackingRoleAtSummaryTransformer.select(),
        department: HrmTimeTrackingDepartmentAtSummaryTransformer.select(),
        employeeContracts: HrmTimeTrackingEmployeeContractTransformer.select(),
        projectMembers:
          HrmTimeTrackingProjectMemberAtSummaryTransformer.select(),
        _count: {
          select: {
            assignedTasks: true,
            timelogs: true,
            timesheets: true,
            timers: true,
          },
        },
      },
    } satisfies Prisma.hrm_time_tracking_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingEmployee> {
    return {
      id: input.id,
      position: input.position ?? null,
      employment_type: input.employment_type,
      status: input.status,
      member: await HrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.member,
      ),
      role: await HrmTimeTrackingRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await HrmTimeTrackingDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      employeeContracts: await ArrayUtil.asyncMap(
        input.employeeContracts,
        HrmTimeTrackingEmployeeContractTransformer.transform,
      ),
      projectMembers: await ArrayUtil.asyncMap(
        input.projectMembers,
        HrmTimeTrackingProjectMemberAtSummaryTransformer.transform,
      ),
      assignedTasksCount: input._count.assignedTasks,
      timelogsCount: input._count.timelogs,
      timesheetsCount: input._count.timesheets,
      timersCount: input._count.timers,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmTimeTrackingEmployee;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingEmployeeTransformer {
//       export type Payload = Prisma.hrm_time_tracking_employeesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             position: true,
//             employment_type: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
//             member: HrmTimeTrackingMemberAtSummaryTransformer.select(),
//             role: HrmTimeTrackingRoleAtSummaryTransformer.select(),
//             department: HrmTimeTrackingDepartmentAtSummaryTransformer.select(),
//             projectMembers: HrmTimeTrackingProjectMemberAtSummaryTransformer.select(),
//             employeeContracts: HrmTimeTrackingEmployeeContractTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_employeesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingEmployee> {
//         return {
//   id: {string},
//   position: {string | null},
//   employment_type: {string},
//   status: {string},
//   member: await HrmTimeTrackingMemberAtSummaryTransformer.transform(input.member),
//   role: await HrmTimeTrackingRoleAtSummaryTransformer.transform(input.role),
//   department: input.department ? await HrmTimeTrackingDepartmentAtSummaryTransformer.transform(input.department) : null,
//   organization: await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(input.organization),
//   employeeContracts: await ArrayUtil.asyncMap(input.employeeContracts, HrmTimeTrackingEmployeeContractTransformer.transform),
//   projectMembers: await ArrayUtil.asyncMap(input.projectMembers, HrmTimeTrackingProjectMemberAtSummaryTransformer.transform),
//   assignedTasksCount: {integer},
//   timelogsCount: {integer},
//   timesheetsCount: {integer},
//   timersCount: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------