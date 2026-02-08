import { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(
  date: Date,
): string & import("typia").tags.Format<"date-time"> {
  return date.toISOString() as string &
    import("typia").tags.Format<"date-time">;
}
export namespace DiscussionBoardScheduledTaskCollector {
  export async function collect(props: {
    body: IDiscussionBoardScheduledTask.ICreate & {
      task_name: string;
      schedule_pattern: string;
      last_run_at: Date | null;
      status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
    };
  }) {
    const id: string = v4();
    const { task_name, schedule_pattern, last_run_at, status } = props.body;
    return {
      id,
      task_name,
      schedule_pattern,
      last_run_at: last_run_at ? toISOStringSafe(last_run_at) : null,
      status,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    } satisfies Prisma.discussion_board_scheduled_tasksCreateInput;
  }
}
