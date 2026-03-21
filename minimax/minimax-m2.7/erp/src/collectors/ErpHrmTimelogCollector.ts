import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimelogCollector {
  export async function collect(props: {
    body: IErpHrmTimelog.ICreate;
    employee: IEntity;
  }) {
    return {
      // Scalar fields
      id: v4(),
      date: new Date(props.body.date),
      duration_minutes: props.body.durationMinutes,
      description: props.body.description ?? null,
      billable: props.body.billable ?? true,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations (Prisma handles FK columns internally)
      employee: { connect: { id: props.employee.id } },
      project: { connect: { id: props.body.projectId } },
      task: props.body.taskId
        ? { connect: { id: props.body.taskId } }
        : undefined,
    } satisfies Prisma.erp_hrm_timelogsCreateInput;
  }
}
