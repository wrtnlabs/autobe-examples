import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformTimerCollector {
  export async function collect(props: {
    body: IHrmPlatformTimer.ICreate;
    hrmPlatformEmployees: IEntity;
    hrmPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      started_at: new Date(),
      stopped_at: null,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      employee: { connect: { id: props.hrmPlatformEmployees.id } },
      project: { connect: { id: props.body.hrm_platform_project_id } },
      task: props.body.hrm_platform_task_id
        ? { connect: { id: props.body.hrm_platform_task_id } }
        : undefined,
    } satisfies Prisma.hrm_platform_timersCreateInput;
  }
}
