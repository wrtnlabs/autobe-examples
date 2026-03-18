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
        estimated_hours: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        project: HrmPlatformProjectAtSummaryTransformer.select(),
        assignedEmployee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        parent: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            estimated_hours: true,
            due_date: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
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
      estimated_hours: input.estimated_hours,
      due_date: input.due_date?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      project: await HrmPlatformProjectAtSummaryTransformer.transform(
        input.project,
      ),
      assignedEmployee: input.assignedEmployee
        ? await HrmPlatformEmployeeAtSummaryTransformer.transform(
            input.assignedEmployee,
          )
        : null,
      parent: input.parent
        ? {
            id: input.parent.id,
            title: input.parent.title,
            status: input.parent.status,
            priority: input.parent.priority,
            estimated_hours: input.parent.estimated_hours,
            due_date: input.parent.due_date?.toISOString() ?? null,
            created_at: input.parent.created_at.toISOString(),
            updated_at: input.parent.updated_at.toISOString(),
            deleted_at: input.parent.deleted_at?.toISOString() ?? null,
            project: undefined,
            assignedEmployee: undefined,
            parent: undefined,
          }
        : null,
    };
  }
}
