import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingTimerCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingTimer.ICreate;
    hrmTimeTrackingEmployees: IEntity;
    hrmTimeTrackingOrganizations: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      started_at: now,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      organization: {
        connect: {
          id: props.hrmTimeTrackingOrganizations.id,
        },
      },
      employee: {
        connect: {
          id: props.hrmTimeTrackingEmployees.id,
        },
      },
      project: {
        connect: {
          id: props.body.hrm_time_tracking_project_id,
        },
      },
      task: props.body.hrm_time_tracking_task_id
        ? {
            connect: {
              id: props.body.hrm_time_tracking_task_id,
            },
          }
        : undefined,
    } satisfies Prisma.hrm_time_tracking_timersCreateInput;
  }
}
