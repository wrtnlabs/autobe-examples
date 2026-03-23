import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTrackerRoleCollector {
  export async function collect(props: {
    body: IHrmTrackerRole.ICreate;
    hrmTrackerOrganizations: IEntity;
  }) {
    const id: string = v4();
    const rolePermissionsInput = props.body.permissions.length
      ? await ArrayUtil.asyncMap(
          props.body.permissions,
          async (permissionCode) => {
            return {
              role_id_permission_id: {
                role_id: id,
                permission_id: permissionCode,
              },
            };
          },
        )
      : undefined;
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      is_custom: true,
      is_default: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.hrmTrackerOrganizations.id } },
      rolePermissions: rolePermissionsInput
        ? { connect: rolePermissionsInput }
        : undefined,
    } satisfies Prisma.hrm_tracker_rolesCreateInput;
  }
}
