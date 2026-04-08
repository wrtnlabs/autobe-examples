import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmDepartmentAtSummaryTransformer } from "./HrmDepartmentAtSummaryTransformer";
import { HrmMemberAtSummaryTransformer } from "./HrmMemberAtSummaryTransformer";
import { HrmOrganizationAtSummaryTransformer } from "./HrmOrganizationAtSummaryTransformer";
import { HrmRoleAtSummaryTransformer } from "./HrmRoleAtSummaryTransformer";

export namespace HrmEmployeeAtSummaryTransformer {
  export type Payload = Prisma.hrm_employeesGetPayload<
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
        organization: HrmOrganizationAtSummaryTransformer.select(),
        user: HrmMemberAtSummaryTransformer.select(),
        role: HrmRoleAtSummaryTransformer.select(),
        department: HrmDepartmentAtSummaryTransformer.select(),
        snapshots: true,
        contracts: true,
        projectMembers: true,
        assignedTasks: true,
        timelogs: true,
        timesheets: true,
        activeTimers: true,
      },
    } satisfies Prisma.hrm_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmEmployee.ISummary> {
    return {
      id: input.id,
      position: input.position,
      employment_type: input.employment_type,
      status: input.status,
      user: await HrmMemberAtSummaryTransformer.transform(input.user),
      organization: await HrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      role: await HrmRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await HrmDepartmentAtSummaryTransformer.transform(input.department)
        : null,
      created_at: input.created_at.toISOString(),
    } satisfies IHrmEmployee.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmEmployeeAtSummaryTransformer {
//       export type Payload = Prisma.hrm_employeesGetPayload<ReturnType<typeof select>>;
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
//             organization: HrmOrganizationAtSummaryTransformer.select(),
//             user: HrmMemberAtSummaryTransformer.select(),
//             role: HrmRoleAtSummaryTransformer.select(),
//             department: HrmDepartmentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_employeesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmEmployee.ISummary> {
//         return {
//   id: {string},
//   position: {string},
//   employment_type: {string},
//   status: {string},
//   user: await HrmMemberAtSummaryTransformer.transform(input.user),
//   organization: await HrmOrganizationAtSummaryTransformer.transform(input.organization),
//   role: await HrmRoleAtSummaryTransformer.transform(input.role),
//   department: input.department ? await HrmDepartmentAtSummaryTransformer.transform(input.department) : null,
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------