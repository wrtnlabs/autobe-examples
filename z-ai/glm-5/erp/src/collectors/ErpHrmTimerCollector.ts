import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimerCollector {
  export async function collect(props: {
    body: IErpHrmTimer.ICreate;
    employee: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      started_at: new Date(),
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.employee.id } },
      project: { connect: { id: props.body.project_id } },
      task: props.body.task_id
        ? { connect: { id: props.body.task_id } }
        : undefined,
    } satisfies Prisma.erp_hrm_timersCreateInput;
  }
}
