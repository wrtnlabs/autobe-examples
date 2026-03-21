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
    organization: IEntity;
  }) {
    const id: string = v4();
    const rolePermissionsData = await ArrayUtil.asyncMap(
      props.body.permissions,
      async (permissionCode) => ({
        id: v4(),
        permission: permissionCode,
        created_at: new Date(),
        updated_at: new Date(),
      }),
    );
    return {
      // Scalar fields
      id,
      name: props.body.name,
      is_builtin: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      organization: { connect: { id: props.organization.id } },
      // HasMany relations - inline nested create for permissions
      rolePermissions: {
        create: rolePermissionsData,
      },
    } satisfies Prisma.erp_hrm_rolesCreateInput;
  }
}
