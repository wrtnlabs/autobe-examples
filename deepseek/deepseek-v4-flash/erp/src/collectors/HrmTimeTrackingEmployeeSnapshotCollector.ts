import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingEmployeeSnapshotCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingEmployeeSnapshot.ICreate;
    hrmTimeTrackingEmployees: IEntity;
    hrmTimeTrackingMembers: IEntity;
  }) {
    // Query employee to capture current record state
    const employee =
      await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
        where: { id: props.hrmTimeTrackingEmployees.id },
      });
    return {
      id: v4(),
      status: employee.status,
      employment_type: employee.employment_type,
      position: employee.position,
      changed_field: props.body.changed_field,
      old_value: props.body.old_value ?? null,
      new_value: props.body.new_value ?? null,
      created_at: new Date(),
      employee: { connect: { id: props.hrmTimeTrackingEmployees.id } },
      actor: { connect: { id: props.hrmTimeTrackingMembers.id } },
      role: { connect: { id: employee.hrm_time_tracking_role_id } },
      department: employee.hrm_time_tracking_department_id
        ? { connect: { id: employee.hrm_time_tracking_department_id } }
        : undefined,
    } satisfies Prisma.hrm_time_tracking_employee_snapshotsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmTimeTrackingEmployeeSnapshotCollector {
//         export async function collect(props: {
//           body: IHrmTimeTrackingEmployeeSnapshot.ICreate;
//           hrmTimeTrackingEmployees: IEntity; // from path parameter employeeId
// hrmTimeTrackingMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       status: ...,
//       employment_type: ...,
//       position: ...,
//       changed_field: ...,
//       old_value: ...,
//       new_value: ...,
//       created_at: ...,
//       employee: ...,
//       actor: ...,
//       role: ...,
//       department: ...,
//           } satisfies Prisma.hrm_time_tracking_employee_snapshotsCreateInput;
//         }
//       }
//--------------------------------------------------------------