import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformEmployeeCollector {
  export async function collect(props: {
    body: IHrmPlatformEmployee.ICreate;
    hrmPlatformOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      position: props.body.position ?? null,
      employment_type: props.body.employmentType,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      member: { connect: { id: props.body.memberId } },
      role: { connect: { id: props.body.roleId } },
      department: props.body.departmentId
        ? { connect: { id: props.body.departmentId } }
        : undefined,
    } satisfies Prisma.hrm_platform_employeesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformEmployeeCollector {
//         export async function collect(props: {
//           body: IHrmPlatformEmployee.ICreate;
//           hrmPlatformOrganizations: IEntity; // from authorized session
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
//       organization: ...,
//       member: ...,
//       role: ...,
//       department: ...,
//       contracts: ...,
//       projectMemberships: ...,
//       tasks: ...,
//       timelogs: ...,
//       timesheets: ...,
//       hrmPlatformTimers: ...,
//           } satisfies Prisma.hrm_platform_employeesCreateInput;
//         }
//       }
//--------------------------------------------------------------