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
    erpHrmOrganizations: IEntity;
    erpHrmMembers: IEntity;
    erpHrmMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      is_builtin: false,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo: organization
      organization: { connect: { id: props.erpHrmOrganizations.id } },
      // HasMany: permissions — inline create (no neighbor collector exists)
      permissions: {
        create: props.body.permissions.map((code) => ({
          id: v4(),
          permission_code: code,
          created_at: new Date(),
        })),
      },
      // HasMany: organizationMembers — omitted (not applicable at creation)
    } satisfies Prisma.erp_hrm_rolesCreateInput;
  }
}
