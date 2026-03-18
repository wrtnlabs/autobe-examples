import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingTimelogCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingTimelog.ICreate;
    organization: IEntity;
    employee: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      work_date: new Date(props.body.work_date),
      duration_minutes: props.body.duration_minutes,
      description: props.body.description ?? null,
      billable: props.body.billable,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      organization: {
        connect: {
          id: props.organization.id,
        },
      },
      employee: {
        connect: {
          id: props.employee.id,
        },
      },
      project: {
        connect: {
          id: props.body.project_id,
        },
      },
      task: props.body.task_id
        ? {
            connect: {
              id: props.body.task_id,
            },
          }
        : undefined,
    } satisfies Prisma.hrm_time_tracking_timelogsCreateInput;
  }
}
