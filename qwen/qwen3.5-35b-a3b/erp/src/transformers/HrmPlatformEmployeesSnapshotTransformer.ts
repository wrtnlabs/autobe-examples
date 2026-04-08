import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployeesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeesSnapshot";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformDepartmentAtSummaryTransformer } from "./HrmPlatformDepartmentAtSummaryTransformer";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";
import { HrmPlatformRoleAtSummaryTransformer } from "./HrmPlatformRoleAtSummaryTransformer";

export namespace HrmPlatformEmployeesSnapshotTransformer {
  export type Payload = Prisma.hrm_platform_employees_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        employee_id: true,
        user_id: true,
        organization_id: true,
        role_id: true,
        department_id: true,
        position: true,
        employment_type: true,
        status: true,
        created_at: true,
        employee: { select: { id: true } },
        user: HrmPlatformMemberAtSummaryTransformer.select(),
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        role: HrmPlatformRoleAtSummaryTransformer.select(),
        department: HrmPlatformDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_employees_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformEmployeesSnapshot> {
    return {
      id: input.id,
      employee_id: input.employee_id,
      user_id: input.user_id,
      organization_id: input.organization_id,
      role_id: input.role_id,
      department_id: input.department_id ?? null,
      position: input.position ?? null,
      employment_type: input.employment_type,
      status: input.status,
      created_at: input.created_at.toISOString(),
      member: await HrmPlatformMemberAtSummaryTransformer.transform(input.user),
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      role: await HrmPlatformRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await HrmPlatformDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
    } satisfies IHrmPlatformEmployeesSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformEmployeesSnapshotTransformer {
//       export type Payload = Prisma.hrm_platform_employees_snapshotsGetPayload<ReturnType<typeof select>>;
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
//             employee_id: true,
//             user: HrmPlatformMemberAtSummaryTransformer.select(),
//             organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
//             role: HrmPlatformRoleAtSummaryTransformer.select(),
//             department: HrmPlatformDepartmentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_employees_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformEmployeesSnapshot> {
//         return {
//   id: {string},
//   employee_id: {string},
//   user_id: {string},
//   organization_id: {string},
//   role_id: {string},
//   department_id: {string | null},
//   position: {string | null},
//   employment_type: {string},
//   status: {string},
//   created_at: {string},
//   member: await HrmPlatformMemberAtSummaryTransformer.transform(input.user),
//   organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(input.organization),
//   role: await HrmPlatformRoleAtSummaryTransformer.transform(input.role),
//   department: input.department ? await HrmPlatformDepartmentAtSummaryTransformer.transform(input.department) : null,
//         };
//       }
//     }
//--------------------------------------------------------------