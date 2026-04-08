import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
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

export namespace HrmPlatformEmployeeAtSummaryTransformer {
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
        member: HrmPlatformMemberAtSummaryTransformer.select(),
        role: HrmPlatformRoleAtSummaryTransformer.select(),
        department: HrmPlatformDepartmentAtSummaryTransformer.select(),
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformEmployee.ISummary> {
    return {
      id: input.id,
      employee_code: input.employee_code,
      display_name: input.display_name,
      email: input.email,
      phone_number: input.phone_number ?? undefined,
      job_title: input.job_title ?? undefined,
      job_level: input.job_level,
      employment_type: input.employment_type,
      status: input.status,
      start_date: input.start_date.toISOString(),
      end_date: input.end_date?.toISOString() ?? undefined,
      is_pending: input.is_pending,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      member: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      role: await HrmPlatformRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await HrmPlatformDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
    } satisfies IHrmPlatformEmployee.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformEmployeeAtSummaryTransformer {
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
//             organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
//             member: HrmPlatformMemberAtSummaryTransformer.select(),
//             role: HrmPlatformRoleAtSummaryTransformer.select(),
//             department: HrmPlatformDepartmentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_employeesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformEmployee.ISummary> {
//         return {
//   id: {string},
//   employee_code: {string},
//   display_name: {string},
//   email: {string},
//   phone_number: {string | null},
//   job_title: {string | null},
//   job_level: {string},
//   employment_type: {string},
//   status: {string},
//   start_date: {string},
//   end_date: {string | null},
//   is_pending: {boolean},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   member: await HrmPlatformMemberAtSummaryTransformer.transform(input.member),
//   role: await HrmPlatformRoleAtSummaryTransformer.transform(input.role),
//   department: input.department ? await HrmPlatformDepartmentAtSummaryTransformer.transform(input.department) : null,
//   organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(input.organization),
//         };
//       }
//     }
//--------------------------------------------------------------