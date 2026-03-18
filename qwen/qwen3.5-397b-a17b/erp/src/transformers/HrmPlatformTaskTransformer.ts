import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformEmployeeAtSummaryTransformer } from "./HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformProjectAtSummaryTransformer } from "./HrmPlatformProjectAtSummaryTransformer";
import { HrmPlatformTaskAtSummaryTransformer } from "./HrmPlatformTaskAtSummaryTransformer";

export namespace HrmPlatformTaskTransformer {
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
        project: HrmPlatformProjectAtSummaryTransformer.select(),
        assignee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        parent: HrmPlatformTaskAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_tasksFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmPlatformTask> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      status: typia.assert<"completed" | "open" | "in-progress" | "closed">(
        input.status,
      ),
      priority: typia.assert<"low" | "medium" | "high" | "urgent">(
        input.priority,
      ),
      estimated_hours: input.estimated_hours ?? null,
      due_date: input.due_date ? toISOStringSafe(input.due_date) : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      assignee: input.assignee
        ? await HrmPlatformEmployeeAtSummaryTransformer.transform(
            input.assignee,
          )
        : null,
      parent: input.parent
        ? await HrmPlatformTaskAtSummaryTransformer.transform(input.parent)
        : null,
      project: await HrmPlatformProjectAtSummaryTransformer.transform(
        input.project,
      ),
    };
  }
}
