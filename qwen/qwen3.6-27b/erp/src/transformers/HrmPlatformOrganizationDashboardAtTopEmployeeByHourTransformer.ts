import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboard";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformDepartmentAtSummaryTransformer } from "./HrmPlatformDepartmentAtSummaryTransformer";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";

export namespace HrmPlatformOrganizationDashboardAtTopEmployeeByHourTransformer {
  export type Payload = Prisma.hrm_platform_employeesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        position: true,
        member: HrmPlatformMemberAtSummaryTransformer.select(),
        department: HrmPlatformDepartmentAtSummaryTransformer.select(),
        timelogs: {
          select: {
            duration_minutes: true,
          },
        } satisfies Prisma.hrm_platform_timelogsFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformOrganizationDashboard.ITopEmployeeByHour> {
    return {
      id: input.id,
      position: input.position,
      department: input.department
        ? await HrmPlatformDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
      member: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      totalHours:
        input.timelogs.reduce((sum, t) => sum + t.duration_minutes, 0) / 60,
    } satisfies IHrmPlatformOrganizationDashboard.ITopEmployeeByHour;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformOrganizationDashboardAtTopEmployeeByHourTransformer {
//       export type Payload = Prisma.hrm_platform_employeesGetPayload<ReturnType<typeof select>>;
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
//             hrm_platform_organization_id: true,
//             member: HrmPlatformMemberAtSummaryTransformer.select(),
//             hrm_platform_role_id: true,
//             department: HrmPlatformDepartmentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_employeesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformOrganizationDashboard.ITopEmployeeByHour> {
//         return {
//   position: {string | null},
//   department: input.department ? await HrmPlatformDepartmentAtSummaryTransformer.transform(input.department) : null,
//   member: await HrmPlatformMemberAtSummaryTransformer.transform(input.member),
//   totalHours: {number},
//   id: {string},
//         };
//       }
//     }
//--------------------------------------------------------------