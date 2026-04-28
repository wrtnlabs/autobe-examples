import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformRolePermissionCollector {
  export async function collect(props: {
    body: IHrmPlatformRolePermission.ICreate;
    hrmPlatformRoles: IEntity;
  }) {
    return {
      id: v4(),
      permission_key: props.body.permissionKey,
      created_at: new Date(),
      updated_at: new Date(),
      role: { connect: { id: props.hrmPlatformRoles.id } },
    } satisfies Prisma.hrm_platform_role_permissionsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformRolePermissionCollector {
//         export async function collect(props: {
//           body: IHrmPlatformRolePermission.ICreate;
//           hrmPlatformRoles: IEntity; // from path parameter roleId
//           
//           
//         }) {
//           return {
//       id: ...,
//       permission_key: ...,
//       created_at: ...,
//       updated_at: ...,
//       role: ...,
//           } satisfies Prisma.hrm_platform_role_permissionsCreateInput;
//         }
//       }
//--------------------------------------------------------------