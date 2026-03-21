import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmRoleCollector {
  export async function collect(props: {
    body: IErpHrmRole.ICreate;
    organization: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      is_builtin: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.organization.id } },
      permissions: props.body.permissions.length
        ? {
            create: props.body.permissions.map((permission) => ({
              id: v4(),
              permission: permission,
              created_at: new Date(),
            })),
          }
        : undefined,
    } satisfies Prisma.erp_hrm_rolesCreateInput;
  }
}
