import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { ErpHrmRolePermissionCollector } from "./ErpHrmRolePermissionCollector";

export namespace ErpHrmRoleCollector {
  export async function collect(props: {
    body: IErpHrmRole.ICreate;
    erpHrmOrganizations: IEntity;
  }) {
    const id = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      is_builtin: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.erpHrmOrganizations.id } },
      rolePermissions: props.body.permissions.length
        ? {
            create: await ArrayUtil.asyncMap(
              props.body.permissions,
              (permission) =>
                ErpHrmRolePermissionCollector.collect({
                  body: permission,
                  erpHrmRoles: { id },
                }),
            ),
          }
        : undefined,
    } satisfies Prisma.erp_hrm_rolesCreateInput;
  }
}
