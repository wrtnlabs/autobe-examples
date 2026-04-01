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
    hrmPlatformMemberSessions: IEntity;
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
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      permissions: props.body.permission_ids.length
        ? {
            connectOrCreate: await ArrayUtil.asyncMap(
              props.body.permission_ids,
              async (permission) => ({
                where: { id: permission.id },
                create: {
                  id: permission.id,
                  name: permission.name,
                  description: permission.description ?? null,
                  category: permission.category ?? null,
                  created_at: new Date(permission.created_at),
                  updated_at: new Date(permission.updated_at),
                  deleted_at: permission.deleted_at
                    ? new Date(permission.deleted_at)
                    : null,
                  permission: { connect: { id: permission.id } },
                },
              }),
            ),
          }
        : undefined,
    };
  }
}
