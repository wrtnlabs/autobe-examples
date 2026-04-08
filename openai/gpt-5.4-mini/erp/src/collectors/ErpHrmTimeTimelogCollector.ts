import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTimelogCollector {
  export async function collect(props: {
    body: IErpHrmTimeTimelog.ICreate;
    member: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      work_date: new Date(props.body.workDate),
      duration_minutes: props.body.durationMinutes,
      description: props.body.description ?? null,
      billable: props.body.billable ?? true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: {
        connect: {
          id: props.member.id,
        },
      },
      project: {
        connect: {
          id: props.body.projectId,
        },
      },
      task: props.body.taskId
        ? {
            connect: {
              id: props.body.taskId,
            },
          }
        : undefined,
    } satisfies Prisma.erp_hrm_time_timelogsCreateInput;
  }
}
