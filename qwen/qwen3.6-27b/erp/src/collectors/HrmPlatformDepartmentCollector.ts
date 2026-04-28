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
    return {
      // Scalar fields
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      parentDepartment: props.body.parent_department_id
        ? { connect: { id: props.body.parent_department_id } }
        : undefined,
      // HasMany relations (reverse — not needed)
      // employees, childDepartments, snapshots — set by parent collectors
    } satisfies Prisma.hrm_platform_departmentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformDepartmentCollector {
//         export async function collect(props: {
//           body: IHrmPlatformDepartment.ICreate;
//           hrmPlatformOrganizations: IEntity; // from authorized session
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
//       employees: ...,
//       childDepartments: ...,
//       snapshots: ...,
//           } satisfies Prisma.hrm_platform_departmentsCreateInput;
//         }
//       }
//--------------------------------------------------------------