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
    role: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      role: {
        connect: {
          id: props.role.id,
        },
      },
      permission: {
        connect: {
          id: props.body.erpHrmTimePermissionId,
        },
      },
    } satisfies Prisma.erp_hrm_time_role_permissionsCreateInput;
  }
}
