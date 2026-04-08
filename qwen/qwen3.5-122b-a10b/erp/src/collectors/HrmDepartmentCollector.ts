import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmDepartmentCollector {
  export async function collect(props: {
    body: IHrmDepartment.ICreate;
    organization: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.organization.id } },
      parentDepartment: props.body.parent_department_id
        ? { connect: { id: props.body.parent_department_id } }
        : undefined,
      childDepartments: undefined,
      employees: undefined,
      employeeSnapshots: undefined,
    } satisfies Prisma.hrm_departmentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmDepartmentCollector {
//         export async function collect(props: {
//           body: IHrmDepartment.ICreate;
//           hrmOrganizations: IEntity; // from path parameter organizationId
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
//       parentDepartment: ...,
//       childDepartments: ...,
//       employees: ...,
//       employeeSnapshots: ...,
//           } satisfies Prisma.hrm_departmentsCreateInput;
//         }
//       }
//--------------------------------------------------------------