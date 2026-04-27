import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingDepartmentCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingDepartment.ICreate;
    organization: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.organization.id } },
      parent: props.body.parentId
        ? { connect: { id: props.body.parentId } }
        : undefined,
      children: undefined,
      snapshots: undefined,
      employees: undefined,
      employeeSnapshots: undefined,
    } satisfies Prisma.hrm_time_tracking_departmentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmTimeTrackingDepartmentCollector {
//         export async function collect(props: {
//           body: IHrmTimeTrackingDepartment.ICreate;
//           hrmTimeTrackingOrganizations: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organization: ...,
//       parent: ...,
//       children: ...,
//       snapshots: ...,
//       employees: ...,
//       employeeSnapshots: ...,
//           } satisfies Prisma.hrm_time_tracking_departmentsCreateInput;
//         }
//       }
//--------------------------------------------------------------