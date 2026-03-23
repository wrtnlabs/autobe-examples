import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformRolePermissionCollector {
  export async function collect(props: {
    body: IHrmPlatformRolePermission.ICreate;
    hrmPlatformRoles: IEntity;
  }) {
    return {
      id: v4(),
      permission_code: props.body.permission_code,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      role: { connect: { id: props.hrmPlatformRoles.id } },
    } satisfies Prisma.hrm_platform_role_permissionsCreateInput;
  }
}
