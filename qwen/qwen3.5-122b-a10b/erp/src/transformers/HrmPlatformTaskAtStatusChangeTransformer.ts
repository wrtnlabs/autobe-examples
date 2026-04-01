import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformTaskAtStatusChangeTransformer {
  export type Payload = Prisma.hrm_platform_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        estimated_hours: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        project: {
          select: {
            id: true,
          },
        },
        parent: {
          select: {
            id: true,
          },
        },
        assignedEmployee: {
          select: {
            id: true,
          },
        },
        children: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_tasksFindManyArgs,
        histories: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_task_historiesFindManyArgs,
        taskTimelogs: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_timelogsFindManyArgs,
        timers: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_timersFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTask.IStatusChange> {
    return {
      status: typia.assert<"completed" | "open" | "in-progress" | "closed">(
        input.status,
      ),
    };
  }
}
