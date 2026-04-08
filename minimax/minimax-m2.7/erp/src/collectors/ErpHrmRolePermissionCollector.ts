import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmRolePermissionCollector {
  export async function collect(props: {
    body: IErpHrmRolePermission.ICreate;
    role: IEntity;
  }) {
    return {
      id: v4(),
      permission: props.body.permission,
      created_at: new Date(),
      updated_at: new Date(),
      role: { connect: { id: props.role.id } },
    } satisfies Prisma.erp_hrm_role_permissionsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmRolePermissionCollector {
//         export async function collect(props: {
//           body: IErpHrmRolePermission.ICreate;
//           erpHrmRoles: IEntity; // from path parameter roleId
//           
//           
//         }) {
//           return {
//       id: ...,
//       permission: ...,
//       created_at: ...,
//       updated_at: ...,
//       role: ...,
//           } satisfies Prisma.erp_hrm_role_permissionsCreateInput;
//         }
//       }
//--------------------------------------------------------------