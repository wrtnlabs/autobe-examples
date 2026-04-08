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
    // Query member by email since DTO only provides email, not memberId
    const member = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
      where: { email: props.body.email },
    });
    return {
      // Scalar fields
      id: v4(),
      position: props.body.position ?? null,
      employment_type: props.body.employmentType,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      member: { connect: { id: member.id } },
      organization: { connect: { id: props.organization.id } },
      role: { connect: { id: props.body.roleId } },
      department: props.body.departmentId
        ? { connect: { id: props.body.departmentId } }
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
//           erpHrmOrganizations: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       position: ...,
//       employment_type: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       member: ...,
//       organization: ...,
//       role: ...,
//       department: ...,
//       contracts: ...,
//       projectMemberships: ...,
//       assignedTasks: ...,
//       timelogs: ...,
//       timesheets: ...,
//       reviewedTimesheets: ...,
//       timers: ...,
//           } satisfies Prisma.erp_hrm_employeesCreateInput;
//         }
//       }
//--------------------------------------------------------------