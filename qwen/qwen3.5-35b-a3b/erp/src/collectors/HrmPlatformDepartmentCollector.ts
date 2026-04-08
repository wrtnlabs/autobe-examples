import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformDepartmentCollector {
  export async function collect(props: {
    body: IHrmPlatformDepartment.ICreate;
    hrmPlatformOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      parentDepartment: props.body.parent_department_id
        ? { connect: { id: props.body.parent_department_id } }
        : undefined,
    } satisfies Prisma.hrm_platform_departmentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformDepartmentCollector {
//         export async function collect(props: {
//           body: IHrmPlatformDepartment.ICreate;
//           hrmPlatformOrganizations: IEntity; // from path parameter organizationId
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organization: ...,
//       parentDepartment: ...,
//       childDepartments: ...,
//       snapshots: ...,
//       employees: ...,
//       employeeSnapshots: ...,
//           } satisfies Prisma.hrm_platform_departmentsCreateInput;
//         }
//       }
//--------------------------------------------------------------