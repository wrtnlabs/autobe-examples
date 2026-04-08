import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmRoleCollector {
  export async function collect(props: {
    body: IErpHrmRole.ICreate;
    erpHrmOrganizations: IEntity;
    erpHrmAdminSessions: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      is_builtin: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.erpHrmOrganizations.id } },
      rolePermissions: {
        create: props.body.permissions.map((permission) => ({
          id: v4(),
          permission,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      },
    } satisfies Prisma.erp_hrm_rolesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmRoleCollector {
//         export async function collect(props: {
//           body: IErpHrmRole.ICreate;
//           erpHrmOrganizations: IEntity; // from authorized session
// erpHrmAdminSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       is_builtin: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organization: ...,
//       employees: ...,
//       rolePermissions: ...,
//       invitations: ...,
//           } satisfies Prisma.erp_hrm_rolesCreateInput;
//         }
//       }
//--------------------------------------------------------------