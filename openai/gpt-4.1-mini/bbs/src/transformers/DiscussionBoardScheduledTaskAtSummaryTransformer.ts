import { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardScheduledTaskAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_scheduled_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        task_name: true,
        schedule_pattern: true,
        last_run_at: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_scheduled_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardScheduledTask.ISummary> {
    return {
      id: input.id,
      taskName: input.task_name,
      schedulePattern: input.schedule_pattern,
      lastRunAt: input.last_run_at?.toISOString() ?? null,
      status: input.status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
