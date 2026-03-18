import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { HrmPlatformRolePermissionCollector } from "./HrmPlatformRolePermissionCollector";

export namespace HrmPlatformRoleCollector {
  export async function collect(props: {
    body: IHrmPlatformRole.ICreate;
    hrmPlatformOrganizations: IEntity;
    hrmPlatformMembers: IEntity;
    hrmPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      built_in: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      permissions: props.body.permissions.length
        ? {
            create: await ArrayUtil.asyncMap(
              props.body.permissions,
              (permission) =>
                HrmPlatformRolePermissionCollector.collect({
                  body: permission,
                  hrmPlatformRoles: { id },
                }),
            ),
          }
        : undefined,
    } satisfies Prisma.hrm_platform_rolesCreateInput;
  }
}
