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
    return {
      id: v4(),
      name: props.body.name,
      built_in: false,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      rolePermissions: {
        create: await ArrayUtil.asyncMap(
          props.body.permissionKeys,
          async (permissionKey) => ({
            id: v4(),
            permission_key: permissionKey,
            created_at: new Date(),
            updated_at: new Date(),
          }),
        ),
      },
    } satisfies Prisma.hrm_platform_rolesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformRoleCollector {
//         export async function collect(props: {
//           body: IHrmPlatformRole.ICreate;
//           hrmPlatformOrganizations: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       built_in: ...,
//       description: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organization: ...,
//       employees: ...,
//       rolePermissions: ...,
//           } satisfies Prisma.hrm_platform_rolesCreateInput;
//         }
//       }
//--------------------------------------------------------------