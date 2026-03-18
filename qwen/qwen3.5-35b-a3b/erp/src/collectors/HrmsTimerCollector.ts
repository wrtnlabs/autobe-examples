import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmsTimerCollector {
  export async function collect(props: {
    body: IHrmsTimer.ICreate;
    hrmsEmployees: IEntity; // from authorized actor
    hrmsMemberSessions: IEntity; // from authorized session
  }) {
    const id: string = v4();
    return {
      id,
      start_at: new Date(),
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.hrmsEmployees.id } },
      project: { connect: { id: props.body.project_id } },
      task: props.body.task_id
        ? { connect: { id: props.body.task_id } }
        : undefined,
    } satisfies Prisma.hrms_timersCreateInput;
  }
}
