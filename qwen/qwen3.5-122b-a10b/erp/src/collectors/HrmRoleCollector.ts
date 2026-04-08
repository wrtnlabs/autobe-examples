import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmRoleCollector {
  export async function collect(props: {
    body: IHrmRole.ICreate;
    hrmOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      is_builtin: false,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.hrmOrganizations.id } },
    } satisfies Prisma.hrm_rolesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmRoleCollector {
//         export async function collect(props: {
//           body: IHrmRole.ICreate;
//           hrmOrganizations: IEntity; // from path parameter organizationId
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       is_builtin: ...,
//       description: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organization: ...,
//       employeeAssignments: ...,
//       invitations: ...,
//       employeeSnapshots: ...,
//       rolePermissions: ...,
//           } satisfies Prisma.hrm_rolesCreateInput;
//         }
//       }
//--------------------------------------------------------------