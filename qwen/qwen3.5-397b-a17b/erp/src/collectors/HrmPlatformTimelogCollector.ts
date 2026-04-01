import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformTimelogCollector {
  export async function collect(props: {
    body: IHrmPlatformTimelog.ICreate;
    employee: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      date: new Date(props.body.date),
      duration_minutes: props.body.durationMinutes,
      description: props.body.description ?? null,
      billable: props.body.billable ?? true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      employee: { connect: { id: props.employee.id } },
      project: { connect: { id: props.body.projectId } },
      task: props.body.taskId
        ? { connect: { id: props.body.taskId } }
        : undefined,
      timesheet: undefined,
    } satisfies Prisma.hrm_platform_timelogsCreateInput;
  }
}
