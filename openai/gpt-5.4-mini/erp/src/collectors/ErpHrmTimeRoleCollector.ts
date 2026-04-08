import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeRoleCollector {
  export async function collect(props: {
    body: IErpHrmTimeRole.ICreate;
    organization: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      is_builtin: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      organization: { connect: { id: props.organization.id } },
    } satisfies Prisma.erp_hrm_time_rolesCreateInput;
  }
}
