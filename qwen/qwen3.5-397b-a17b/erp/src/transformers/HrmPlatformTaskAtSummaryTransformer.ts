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
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformEmployeeAtSummaryTransformer } from "./HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformProjectAtSummaryTransformer } from "./HrmPlatformProjectAtSummaryTransformer";

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
        due_date: true,
        estimated_hours: true,
        created_at: true,
        project: HrmPlatformProjectAtSummaryTransformer.select(),
        assignee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        parentTask: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            due_date: true,
            estimated_hours: true,
            created_at: true,
            project: HrmPlatformProjectAtSummaryTransformer.select(),
            assignee: HrmPlatformEmployeeAtSummaryTransformer.select(),
          },
        } satisfies Prisma.hrm_platform_tasksFindManyArgs,
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
      due_date: input.due_date?.toISOString() ?? undefined,
      estimated_hours: input.estimated_hours ?? undefined,
      assignee: input.assignee
        ? await HrmPlatformEmployeeAtSummaryTransformer.transform(
            input.assignee,
          )
        : null,
      parentTask: input.parentTask
        ? {
            id: input.parentTask.id,
            title: input.parentTask.title,
            status: input.parentTask.status,
            priority: input.parentTask.priority,
            due_date: input.parentTask.due_date?.toISOString() ?? undefined,
            estimated_hours: input.parentTask.estimated_hours ?? undefined,
            assignee: input.parentTask.assignee
              ? await HrmPlatformEmployeeAtSummaryTransformer.transform(
                  input.parentTask.assignee,
                )
              : null,
            parentTask: null,
            project: await HrmPlatformProjectAtSummaryTransformer.transform(
              input.parentTask.project,
            ),
            created_at: input.parentTask.created_at.toISOString(),
          }
        : null,
      project: await HrmPlatformProjectAtSummaryTransformer.transform(
        input.project,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
}
