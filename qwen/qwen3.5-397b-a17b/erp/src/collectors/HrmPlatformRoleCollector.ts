import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformRoleCollector {
  export async function collect(props: { body: IHrmPlatformRole.ICreate }) {
    const id: string = v4();
    const now = new Date();
    return {
      // Scalar fields
      id,
      name: props.body.name,
      is_built_in: false,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      // BelongsTo relations
      organization: { connect: { id: props.body.organization_id } },
      // HasMany relations - rolePermissions junction table
      rolePermissions:
        props.body.permission_ids && props.body.permission_ids.length
          ? {
              create: props.body.permission_ids.map((permissionId) => ({
                id: v4(),
                created_at: now,
                updated_at: now,
                permission: { connect: { id: permissionId } },
              })),
            }
          : undefined,
      // Reverse relations - not needed for create
      employees: undefined,
      employeeInvitations: undefined,
    } satisfies Prisma.hrm_platform_rolesCreateInput;
  }
}
