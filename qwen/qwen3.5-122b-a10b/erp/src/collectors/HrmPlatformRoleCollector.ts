import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformRoleCollector {
  export async function collect(props: {
    body: IHrmPlatformRole.ICreate;
    hrmPlatformOrganizations: IEntity;
  }) {
    const id: string = v4();
    const code: string = props.body.name.toLowerCase().replace(/\s+/g, "_");
    return {
      id,
      code,
      name: props.body.name,
      description: props.body.description ?? null,
      is_builtin: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: {
        connect: { id: props.hrmPlatformOrganizations.id },
      },
      employeeAssignments: undefined,
      employeeSnapshots: undefined,
      permissions: props.body.permission_ids.length
        ? {
            create: props.body.permission_ids.map((permission) => ({
              id: v4(),
              created_at: new Date(),
              updated_at: new Date(),
              permission: {
                connect: { id: permission.id },
              },
            })),
          }
        : undefined,
    } satisfies Prisma.hrm_platform_rolesCreateInput;
  }
}
