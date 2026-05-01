import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmEmployeeCollector {
  export async function collect(props: {
    body: IErpHrmEmployee.ICreate;
    organization: IEntity;
  }) {
    const id: string = v4();
    // Resolve member from invitee email
    const member = await MyGlobal.prisma.erp_hrm_members.findFirstOrThrow({
      where: { email: props.body.email },
    });
    return {
      id,
      erp_hrm_organization_id: props.organization.id,
      position: props.body.position ?? null,
      employment_type: props.body.employment_type,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: member.id } },
      role: { connect: { id: props.body.erp_hrm_role_id } },
      department: props.body.erp_hrm_department_id
        ? { connect: { id: props.body.erp_hrm_department_id } }
        : undefined,
    } satisfies Prisma.erp_hrm_employeesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmEmployeeCollector {
//         export async function collect(props: {
//           body: IErpHrmEmployee.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       erp_hrm_organization_id: ...,
//       position: ...,
//       employment_type: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       member: ...,
//       role: ...,
//       department: ...,
//       contracts: ...,
//       projectMembers: ...,
//       assignedTasks: ...,
//       timelogs: ...,
//       timesheets: ...,
//       timer: ...,
//           } satisfies Prisma.erp_hrm_employeesCreateInput;
//         }
//       }
//--------------------------------------------------------------