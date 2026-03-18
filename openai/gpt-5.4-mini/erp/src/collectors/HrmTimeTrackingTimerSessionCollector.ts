import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimerSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingTimerSessionCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingTimerSession.ICreate;
    employee: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      started_at: now,
      description: props.body.description ?? null,
      ended_at: null,
      discarded_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      employee: { connect: { id: props.employee.id } },
      project: { connect: { id: props.body.project_id } },
      task: props.body.task_id
        ? { connect: { id: props.body.task_id } }
        : undefined,
    } satisfies Prisma.hrm_time_tracking_timer_sessionsCreateInput;
  }
}
