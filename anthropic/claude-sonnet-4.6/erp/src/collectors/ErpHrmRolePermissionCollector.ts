import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmRolePermissionCollector {
  export async function collect(props: {
    body: IErpHrmRolePermission.ICreate;
    erpHrmRoles: IEntity;
    erpHrmMembers: IEntity;
    erpHrmMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      permission_code: props.body.permission_code,
      created_at: new Date(),
      role: { connect: { id: props.erpHrmRoles.id } },
    } satisfies Prisma.erp_hrm_role_permissionsCreateInput;
  }
}
