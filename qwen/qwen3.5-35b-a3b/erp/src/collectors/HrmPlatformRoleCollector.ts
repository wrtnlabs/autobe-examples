import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformRoleCollector {
  export async function collect(props: {
    body: IHrmPlatformRole.ICreate;
    hrmPlatformOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      role_kind: "custom",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
    } satisfies Prisma.hrm_platform_rolesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformRoleCollector {
//         export async function collect(props: {
//           body: IHrmPlatformRole.ICreate;
//           hrmPlatformOrganizations: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       role_kind: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organization: ...,
//       employees: ...,
//       employeeSnapshots: ...,
//       permissions: ...,
//           } satisfies Prisma.hrm_platform_rolesCreateInput;
//         }
//       }
//--------------------------------------------------------------