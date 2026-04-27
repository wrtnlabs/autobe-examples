import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingDepartmentAtSummaryTransformer } from "./HrmTimeTrackingDepartmentAtSummaryTransformer";
import { HrmTimeTrackingMemberAtSummaryTransformer } from "./HrmTimeTrackingMemberAtSummaryTransformer";
import { HrmTimeTrackingRoleAtSummaryTransformer } from "./HrmTimeTrackingRoleAtSummaryTransformer";

export namespace HrmTimeTrackingEmployeeAtSummaryTransformer {
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
        member: HrmTimeTrackingMemberAtSummaryTransformer.select(),
        role: HrmTimeTrackingRoleAtSummaryTransformer.select(),
        department: HrmTimeTrackingDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingEmployee.ISummary> {
    return {
      id: input.id,
      member: await HrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.member,
      ),
      role: await HrmTimeTrackingRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await HrmTimeTrackingDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
      position: input.position ?? null,
      employment_type: input.employment_type,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmTimeTrackingEmployee.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingEmployeeAtSummaryTransformer {
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
//             hrm_time_tracking_organization_id: true,
//             member: HrmTimeTrackingMemberAtSummaryTransformer.select(),
//             role: HrmTimeTrackingRoleAtSummaryTransformer.select(),
//             department: HrmTimeTrackingDepartmentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_employeesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingEmployee.ISummary> {
//         return {
//   id: {string},
//   member: await HrmTimeTrackingMemberAtSummaryTransformer.transform(input.member),
//   role: await HrmTimeTrackingRoleAtSummaryTransformer.transform(input.role),
//   department: input.department ? await HrmTimeTrackingDepartmentAtSummaryTransformer.transform(input.department) : null,
//   position: {string | null},
//   employment_type: {string},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------