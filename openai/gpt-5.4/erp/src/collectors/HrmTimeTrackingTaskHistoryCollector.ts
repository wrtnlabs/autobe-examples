import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingTaskHistoryCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingTaskHistory.ICreate;
    task: IEntity;
    actorType: string;
    oldStatus: string;
  }) {
    const now: Date = new Date();
    return {
      id: v4(),
      actor_type: props.actorType,
      old_status: props.oldStatus,
      new_status: props.body.new_status,
      changed_at: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      task: {
        connect: {
          id: props.task.id,
        },
      },
    } satisfies Prisma.hrm_time_tracking_task_historiesCreateInput;
  }
}
