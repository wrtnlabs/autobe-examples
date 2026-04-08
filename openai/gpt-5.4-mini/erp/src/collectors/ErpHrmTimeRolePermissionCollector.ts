import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeRolePermissionCollector {
  export async function collect(props: {
    body: IErpHrmTimeRolePermission.ICreate;
    erpHrmTimeRoles: IEntity;
  }) {
    const permissionKeys = [...new Set(props.body.permissionKeys)];
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      role: { connect: { id: props.erpHrmTimeRoles.id } },
      permission: {
        connect: {
          id: (
            await MyGlobal.prisma.erp_hrm_time_permissions.findFirstOrThrow({
              where: { key: permissionKeys[0] },
              select: { id: true },
            })
          ).id,
        },
      },
    } satisfies Prisma.erp_hrm_time_role_permissionsCreateInput;
  }
}
