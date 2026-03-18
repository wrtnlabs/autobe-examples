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
    organization: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      is_builtin: false,
      created_at: new Date(),
      updated_at: new Date(),
      organization: { connect: { id: props.organization.id } },
      organizationMembers: undefined,
      permissions: props.body.permissions?.length
        ? {
            create: await ArrayUtil.asyncMap(
              props.body.permissions,
              async (permissionCode, i) => ({
                id: v4(),
                hrms_organization_role_id: id,
                code: permissionCode,
                sequence: i,
                permission: permissionCode,
                created_at: new Date(),
                updated_at: new Date(),
              }),
            ),
          }
        : undefined,
      employees: undefined,
    } satisfies Prisma.hrms_organization_rolesCreateInput;
  }
}
