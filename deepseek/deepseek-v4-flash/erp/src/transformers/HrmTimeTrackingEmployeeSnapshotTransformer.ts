import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeSnapshot";
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
import { HrmTimeTrackingEmployeeAtSummaryTransformer } from "./HrmTimeTrackingEmployeeAtSummaryTransformer";
import { HrmTimeTrackingMemberAtSummaryTransformer } from "./HrmTimeTrackingMemberAtSummaryTransformer";
import { HrmTimeTrackingRoleAtSummaryTransformer } from "./HrmTimeTrackingRoleAtSummaryTransformer";

export namespace HrmTimeTrackingEmployeeSnapshotTransformer {
  export type Payload = Prisma.hrm_time_tracking_employee_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        employment_type: true,
        position: true,
        changed_field: true,
        old_value: true,
        new_value: true,
        created_at: true,
        employee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
        actor: HrmTimeTrackingMemberAtSummaryTransformer.select(),
        role: HrmTimeTrackingRoleAtSummaryTransformer.select(),
        department: HrmTimeTrackingDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_employee_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingEmployeeSnapshot> {
    return {
      id: input.id,
      employee: await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      actor: await HrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.actor,
      ),
      role: await HrmTimeTrackingRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await HrmTimeTrackingDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
      status: input.status,
      employmentType: input.employment_type,
      position: input.position ?? null,
      changedField: input.changed_field,
      oldValue: input.old_value ?? null,
      newValue: input.new_value ?? null,
      createdAt: input.created_at.toISOString(),
    } satisfies IHrmTimeTrackingEmployeeSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingEmployeeSnapshotTransformer {
//       export type Payload = Prisma.hrm_time_tracking_employee_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             employment_type: true,
//             position: true,
//             changed_field: true,
//             old_value: true,
//             new_value: true,
//             created_at: true,
//             employee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
//             actor: HrmTimeTrackingMemberAtSummaryTransformer.select(),
//             role: HrmTimeTrackingRoleAtSummaryTransformer.select(),
//             department: HrmTimeTrackingDepartmentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_employee_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingEmployeeSnapshot> {
//         return {
//   id: {string},
//   employee: await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(input.employee),
//   actor: await HrmTimeTrackingMemberAtSummaryTransformer.transform(input.actor),
//   role: await HrmTimeTrackingRoleAtSummaryTransformer.transform(input.role),
//   department: input.department ? await HrmTimeTrackingDepartmentAtSummaryTransformer.transform(input.department) : null,
//   status: {string},
//   employmentType: {string},
//   position: {string | null},
//   changedField: {string},
//   oldValue: {string | null},
//   newValue: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------