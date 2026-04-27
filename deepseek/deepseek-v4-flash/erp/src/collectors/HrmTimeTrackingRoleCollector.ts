import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingRoleCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingRole.ICreate;
    organization: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      type: "custom",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.organization.id } },
      rolePermissions: {
        create: await ArrayUtil.asyncMap(
          props.body.permissions,
          async (permissionCode) => ({
            id: v4(),
            permission_code: permissionCode,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          }),
        ),
      },
    } satisfies Prisma.hrm_time_tracking_rolesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmTimeTrackingRoleCollector {
//         export async function collect(props: {
//           body: IHrmTimeTrackingRole.ICreate;
//           hrmTimeTrackingOrganizations: IEntity; // from path parameter organizationId
// hrmTimeTrackingMembers: IEntity; // from authorized actor
// hrmTimeTrackingMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       type: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organization: ...,
//       rolePermissions: ...,
//       employees: ...,
//       employeeSnapshots: ...,
//       invitations: ...,
//           } satisfies Prisma.hrm_time_tracking_rolesCreateInput;
//         }
//       }
//--------------------------------------------------------------