import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingRoleCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingRole.ICreate;
    organization: IEntity;
  }) {
    const id = v4();
    const now = new Date();
    return {
      id,
      name: props.body.name,
      code: props.body.code ?? null,
      description: props.body.description ?? null,
      is_builtin: false,
      sort_order: props.body.sortOrder,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      organization: {
        connect: { id: props.organization.id },
      },
    } satisfies Prisma.hrm_time_tracking_rolesCreateInput;
  }
}
