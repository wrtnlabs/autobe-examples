import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformRoleCollector {
  export async function collect(props: {
    body: IHrmPlatformRole.ICreate;
    hrmPlatformAdmins: IEntity;
    hrmPlatformAdminSessions: IEntity;
  }): Promise<{
    [key: string]: any;
  }> {
    const id = v4();
    const now = new Date();
    // Query admin record to get email
    const admin = await MyGlobal.prisma.hrm_platform_admins.findFirstOrThrow({
      where: { id: props.hrmPlatformAdmins.id },
    });
    // Find organization where owner's email matches admin's email
    const organization =
      await MyGlobal.prisma.hrm_platform_organizations.findFirstOrThrow({
        where: {
          owner: {
            email: admin.email,
          },
        },
      });
    return {
      id: id,
      name: props.body.name,
      description: props.body.description ?? null,
      is_builtin: false,
      built_in_type: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      organization: {
        connect: { id: organization.id },
      },
      permissions: {
        create: props.body.permissions.map((permissionCode) => ({
          id: v4(),
          permission_code: permissionCode,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })),
      },
    } satisfies Prisma.hrm_platform_rolesCreateInput;
  }
}
