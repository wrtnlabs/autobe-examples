import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingRolePermissionCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingRolePermission.ICreate;
    role: IEntity;
  }): Promise<Prisma.hrm_time_tracking_role_permissionsCreateInput[]> {
    const now: Date = new Date();
    return props.body.permissions.map(
      (permission) =>
        ({
          id: v4(),
          permission,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          role: {
            connect: {
              id: props.role.id,
            },
          },
        }) satisfies Prisma.hrm_time_tracking_role_permissionsCreateInput,
    );
  }
}
