import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmDepartmentCollector {
  export async function collect(props: {
    body: IErpHrmDepartment.ICreate;
    organization: IEntity;
  }) {
    return {
      id: v4(),
      erp_hrm_organization_id: props.organization.id,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      parent: props.body.parent_id
        ? { connect: { id: props.body.parent_id } }
        : undefined,
      employees: undefined,
      children: undefined,
    } satisfies Prisma.erp_hrm_departmentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmDepartmentCollector {
//         export async function collect(props: {
//           body: IErpHrmDepartment.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       erp_hrm_organization_id: ...,
//       name: ...,
//       description: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       parent: ...,
//       employees: ...,
//       children: ...,
//           } satisfies Prisma.erp_hrm_departmentsCreateInput;
//         }
//       }
//--------------------------------------------------------------