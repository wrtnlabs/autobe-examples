import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
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
import { HrmTimeTrackingMemberAtSummaryTransformer } from "./HrmTimeTrackingMemberAtSummaryTransformer";
import { HrmTimeTrackingRoleAtSummaryTransformer } from "./HrmTimeTrackingRoleAtSummaryTransformer";

export namespace HrmTimeTrackingEmployeeSnapshotAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_employee_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        changed_field: true,
        old_value: true,
        new_value: true,
        created_at: true,
        actor: HrmTimeTrackingMemberAtSummaryTransformer.select(),
        role: HrmTimeTrackingRoleAtSummaryTransformer.select(),
        department: HrmTimeTrackingDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_employee_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingEmployeeSnapshot.ISummary> {
    return {
      id: input.id,
      changed_field: input.changed_field,
      old_value: input.old_value ?? null,
      new_value: input.new_value ?? null,
      created_at: input.created_at.toISOString(),
      actor: await HrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.actor,
      ),
      role: await HrmTimeTrackingRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await HrmTimeTrackingDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
    } satisfies IHrmTimeTrackingEmployeeSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingEmployeeSnapshotAtSummaryTransformer {
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
//             hrm_time_tracking_employee_id: true,
//             actor: HrmTimeTrackingMemberAtSummaryTransformer.select(),
//             role: HrmTimeTrackingRoleAtSummaryTransformer.select(),
//             department: HrmTimeTrackingDepartmentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_employee_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingEmployeeSnapshot.ISummary> {
//         return {
//   id: {string},
//   changed_field: {string},
//   old_value: {string | null},
//   new_value: {string | null},
//   created_at: {string},
//   actor: await HrmTimeTrackingMemberAtSummaryTransformer.transform(input.actor),
//   role: await HrmTimeTrackingRoleAtSummaryTransformer.transform(input.role),
//   department: input.department ? await HrmTimeTrackingDepartmentAtSummaryTransformer.transform(input.department) : null,
//         };
//       }
//     }
//--------------------------------------------------------------