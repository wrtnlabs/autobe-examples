import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingRolePermissionCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingRolePermission.ICreate;
    hrmTimeTrackingRoles: IEntity;
  }) {
    return {
      id: v4(),
      permission_code: props.body.permission_code,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      role: { connect: { id: props.hrmTimeTrackingRoles.id } },
    } satisfies Prisma.hrm_time_tracking_role_permissionsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmTimeTrackingRolePermissionCollector {
//         export async function collect(props: {
//           body: IHrmTimeTrackingRolePermission.ICreate;
//           hrmTimeTrackingRoles: IEntity; // from path parameter roleId
//           
//           
//         }) {
//           return {
//       id: ...,
//       permission_code: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       role: ...,
//           } satisfies Prisma.hrm_time_tracking_role_permissionsCreateInput;
//         }
//       }
//--------------------------------------------------------------