import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackTimerCollector {
  export async function collect(props: {
    body: IHrmTimeTrackTimer.ICreate;
    hrmTimeTrackEmployees: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      started_at: new Date(),
      description: props.body.description ?? null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      employee: { connect: { id: props.hrmTimeTrackEmployees.id } },
      project: { connect: { id: props.body.project_id } },
      task: props.body.task_id
        ? { connect: { id: props.body.task_id } }
        : undefined,
    } satisfies Prisma.hrm_time_track_timersCreateInput;
  }
}
