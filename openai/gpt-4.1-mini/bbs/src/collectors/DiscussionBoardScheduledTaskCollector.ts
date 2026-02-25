import { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardScheduledTaskCollector {
  export async function collect(props: {
    body: IDiscussionBoardScheduledTask.ICreate;
  }) {
    const id = (await import("uuid")).v4();
    return {
      id,
      task_name: props.body.taskName,
      schedule_pattern: props.body.schedulePattern,
      last_run_at: null,
      status: props.body.status,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.discussion_board_scheduled_tasksCreateInput;
  }
}
