import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        assignedEmployee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        parentTask: HrmPlatformTaskAtSummaryTransformer.select(),
        subtasks: {
          select: HrmPlatformTaskAtSummaryTransformer.select().select,
        } satisfies Prisma.hrm_platform_tasksFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_tasksFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmPlatformTask> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? undefined,
      status: input.status,
      priority: input.priority,
      estimated_hours: input.estimated_hours ?? undefined,
      due_date: input.due_date ? toISOStringSafe(input.due_date) : undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      project: await HrmPlatformProjectAtSummaryTransformer.transform(
        input.project,
      ),
      assignedEmployee: input.assignedEmployee
        ? await HrmPlatformEmployeeAtSummaryTransformer.transform(
            input.assignedEmployee,
          )
        : undefined,
      parentTask: input.parentTask
        ? await HrmPlatformTaskAtSummaryTransformer.transform(input.parentTask)
        : undefined,
      subtasks: await ArrayUtil.asyncMap(
        input.subtasks,
        async (subtask) =>
          await HrmPlatformTaskAtSummaryTransformer.transform(subtask),
      ),
    } satisfies IHrmPlatformTask;
  }
}
