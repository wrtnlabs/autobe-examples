import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmsTimelogCollector {
  export async function collect(props: {
    body: IHrmsTimelog.ICreate;
    hrmsEmployees: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      billable: props.body.billable,
      created_at: new Date(),
      date: new Date(props.body.date),
      description: props.body.description ?? null,
      duration_minutes: props.body.duration_minutes,
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      employee: { connect: { id: props.hrmsEmployees.id } },
      project: { connect: { id: props.body.project_id } },
      task: props.body.task_id
        ? { connect: { id: props.body.task_id } }
        : undefined,
    } satisfies Prisma.hrms_timelogsCreateInput;
  }
}
