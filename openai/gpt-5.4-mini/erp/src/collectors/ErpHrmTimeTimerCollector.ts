import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTimerCollector {
  export async function collect(props: {
    body: IErpHrmTimeTimer.ICreate;
    member: IEntity;
    employee: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      started_at: now,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: { connect: { id: props.member.id } },
      employee: { connect: { id: props.employee.id } },
      project: { connect: { id: props.body.project_id } },
      task: props.body.task_id
        ? { connect: { id: props.body.task_id } }
        : undefined,
    } satisfies Prisma.erp_hrm_time_timersCreateInput;
  }
}
