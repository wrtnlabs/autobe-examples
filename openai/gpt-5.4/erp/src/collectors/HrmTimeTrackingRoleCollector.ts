import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { HrmTimeTrackingRolePermissionCollector } from "./HrmTimeTrackingRolePermissionCollector";

export namespace HrmTimeTrackingRoleCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingRole.ICreate;
    organization: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    const permissions = props.body.permissions.length
      ? (
          await ArrayUtil.asyncMap(props.body.permissions, (body) =>
            HrmTimeTrackingRolePermissionCollector.collect({
              body,
              role: { id },
            }),
          )
        ).flat()
      : undefined;
    return {
      id,
      name: props.body.name,
      built_in: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      organization: {
        connect: {
          id: props.organization.id,
        },
      },
      permissions: permissions
        ? {
            create: permissions,
          }
        : undefined,
    } satisfies Prisma.hrm_time_tracking_rolesCreateInput;
  }
}
