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
      description: props.body.description ?? null,
      started_at: new Date(),
      stopped_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.hrmPlatformEmployees.id } },
      project: { connect: { id: props.body.projectId } },
      task: props.body.taskId
        ? { connect: { id: props.body.taskId } }
        : undefined,
    } satisfies Prisma.hrm_platform_timersCreateInput;
  }
}
