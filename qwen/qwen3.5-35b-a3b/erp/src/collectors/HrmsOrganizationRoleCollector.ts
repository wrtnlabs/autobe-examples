import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmsOrganizationRoleCollector {
  export async function collect(props: {
    body: IHrmsOrganizationRole.ICreate;
    hrmsOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      is_builtin: false,
      created_at: new Date(),
      updated_at: new Date(),
      organization: { connect: { id: props.hrmsOrganizations.id } },
      permissions: props.body.permissions?.length
        ? {
            create: props.body.permissions.map((permissionCode) => ({
              id: v4(),
              hrms_organization_role_id: id,
              permission: permissionCode,
              created_at: new Date(),
              updated_at: new Date(),
            })),
          }
        : undefined,
    } satisfies Prisma.hrms_organization_rolesCreateInput;
  }
}
