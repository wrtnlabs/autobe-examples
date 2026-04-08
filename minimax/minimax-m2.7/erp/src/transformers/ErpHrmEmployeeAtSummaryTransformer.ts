import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmDepartmentAtSummaryTransformer } from "./ErpHrmDepartmentAtSummaryTransformer";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";
import { ErpHrmRoleAtSummaryTransformer } from "./ErpHrmRoleAtSummaryTransformer";

export namespace ErpHrmEmployeeAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_employeesGetPayload<
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
        member: ErpHrmMemberAtSummaryTransformer.select(),
        organization: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_organizationsFindManyArgs,
        role: ErpHrmRoleAtSummaryTransformer.select(),
        department: ErpHrmDepartmentAtSummaryTransformer.select(),
        contracts: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_contractsFindManyArgs,
        projectMemberships: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_project_membersFindManyArgs,
        assignedTasks: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_tasksFindManyArgs,
        timelogs: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_timelogsFindManyArgs,
        timesheets: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_timesheetsFindManyArgs,
        reviewedTimesheets: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_timesheetsFindManyArgs,
        timers: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_timersFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmEmployee.ISummary> {
    return {
      id: input.id,
      position: input.position ?? null,
      employmentType: input.employment_type,
      status: input.status,
      member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
      role: await ErpHrmRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await ErpHrmDepartmentAtSummaryTransformer.transform(input.department)
        : undefined,
    } satisfies IErpHrmEmployee.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmEmployeeAtSummaryTransformer {
//       export type Payload = Prisma.erp_hrm_employeesGetPayload<ReturnType<typeof select>>;
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
//             member: ErpHrmMemberAtSummaryTransformer.select(),
//             erp_hrm_organization_id: true,
//             role: ErpHrmRoleAtSummaryTransformer.select(),
//             department: ErpHrmDepartmentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_employeesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmEmployee.ISummary> {
//         return {
//   id: {string},
//   position: {string | null},
//   employmentType: {string},
//   status: {string},
//   member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
//   role: await ErpHrmRoleAtSummaryTransformer.transform(input.role),
//   department: input.department ? await ErpHrmDepartmentAtSummaryTransformer.transform(input.department) : null,
//         };
//       }
//     }
//--------------------------------------------------------------