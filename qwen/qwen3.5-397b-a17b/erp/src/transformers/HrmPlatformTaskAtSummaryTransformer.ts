import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

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
        status: true,
        priority: true,
        estimated_hours: true,
        due_date: true,
        created_at: true,
        assignee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        parent: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            estimated_hours: true,
            due_date: true,
            created_at: true,
            assignee: HrmPlatformEmployeeAtSummaryTransformer.select(),
            parent: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                estimated_hours: true,
                due_date: true,
                created_at: true,
                assignee: HrmPlatformEmployeeAtSummaryTransformer.select(),
              },
            },
          },
        },
      },
    } satisfies Prisma.hrm_platform_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTask.ISummary> {
    return {
      id: input.id,
      title: input.title,
      status: input.status,
      priority: input.priority,
      estimated_hours: input.estimated_hours,
      due_date: input.due_date?.toISOString() ?? null,
      assignee: input.assignee
        ? await HrmPlatformEmployeeAtSummaryTransformer.transform(
            input.assignee,
          )
        : null,
      parent: input.parent
        ? await HrmPlatformTaskAtSummaryTransformer.transform(input.parent)
        : null,
      created_at: input.created_at.toISOString(),
    };
  }
}
