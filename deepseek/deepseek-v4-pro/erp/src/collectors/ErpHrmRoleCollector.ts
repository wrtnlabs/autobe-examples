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
    erpHrmMembers: IEntity;
    erpHrmMemberSessions: IEntity;
  }) {
    const id: string = v4();
    const session =
      await MyGlobal.prisma.erp_hrm_member_sessions.findFirstOrThrow({
        where: { id: props.erpHrmMemberSessions.id },
      });
    const permissions = await MyGlobal.prisma.erp_hrm_permissions.findMany({
      where: { key: { in: props.body.permissions } },
    });
    return {
      id,
      erp_hrm_organization_id: session.erp_hrm_organization_id!,
      name: props.body.name,
      is_builtin: false,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      rolePermissions: {
        create: permissions.map((perm) => ({
          id: v4(),
          permission: { connect: { id: perm.id } },
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
//           erpHrmMembers: IEntity; // from authorized actor
// erpHrmMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       erp_hrm_organization_id: ...,
//       name: ...,
//       is_builtin: ...,
//       description: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       employees: ...,
//       rolePermissions: ...,
//           } satisfies Prisma.erp_hrm_rolesCreateInput;
//         }
//       }
//--------------------------------------------------------------