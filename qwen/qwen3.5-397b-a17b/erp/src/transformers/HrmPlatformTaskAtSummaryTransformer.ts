import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformEmployeeAtSummaryTransformer } from "./HrmPlatformEmployeeAtSummaryTransformer";

export namespace HrmPlatformTaskAtSummaryTransformer {
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
        parent_task_id: true,
        project: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_projectsFindManyArgs,
        assignedEmployee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        parentTask: undefined,
        subtasks: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_tasksFindManyArgs,
        histories: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_task_historiesFindManyArgs,
        timelogs: {
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
    cache: VariadicSingleton<
      Promise<IHrmPlatformTask.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IHrmPlatformTask.ISummary> {
    return {
      id: input.id,
      title: input.title,
      status: input.status,
      priority: input.priority,
      due_date: input.due_date?.toISOString() ?? null,
      estimated_hours: input.estimated_hours,
      assignedEmployee: input.assignedEmployee
        ? await HrmPlatformEmployeeAtSummaryTransformer.transform(
            input.assignedEmployee,
          )
        : null,
      parentTask: input.parent_task_id
        ? await cache.get(input.parent_task_id)
        : null,
      created_at: input.created_at.toISOString(),
    } satisfies IHrmPlatformTask.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IHrmPlatformTask.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IHrmPlatformTask.ISummary> => {
        const record =
          await MyGlobal.prisma.hrm_platform_tasks.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
}
