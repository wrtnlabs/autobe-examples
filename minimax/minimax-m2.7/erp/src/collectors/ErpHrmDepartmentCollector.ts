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
    erpHrmOrganizations: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.erpHrmOrganizations.id } },
      parent: props.body.parentId
        ? { connect: { id: props.body.parentId } }
        : undefined,
    } satisfies Prisma.erp_hrm_departmentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmDepartmentCollector {
//         export async function collect(props: {
//           body: IErpHrmDepartment.ICreate;
//           erpHrmOrganizations: IEntity; // from authorized session
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
//       employees: ...,
//       children: ...,
//       invitations: ...,
//           } satisfies Prisma.erp_hrm_departmentsCreateInput;
//         }
//       }
//--------------------------------------------------------------