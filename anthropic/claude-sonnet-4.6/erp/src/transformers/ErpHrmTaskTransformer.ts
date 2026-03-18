import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";
import { ErpHrmProjectAtSummaryTransformer } from "./ErpHrmProjectAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";
import { ErpHrmTaskHistoryTransformer } from "./ErpHrmTaskHistoryTransformer";

export namespace ErpHrmTaskTransformer {
  export type Payload = Prisma.erp_hrm_tasksGetPayload<
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
        project: ErpHrmProjectAtSummaryTransformer.select(),
        assignee: ErpHrmOrganizationMemberAtSummaryTransformer.select(),
        parent: ErpHrmTaskAtSummaryTransformer.select(),
        subtasks: ErpHrmTaskAtSummaryTransformer.select(),
        taskHistories: ErpHrmTaskHistoryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_tasksFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTask> {
    return {
      id: input.id,
      project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
      assignee: input.assignee
        ? await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
            input.assignee,
          )
        : null,
      parent: input.parent
        ? await ErpHrmTaskAtSummaryTransformer.transform(input.parent)
        : null,
      subtasks: await ArrayUtil.asyncMap(
        input.subtasks,
        ErpHrmTaskAtSummaryTransformer.transform,
      ),
      taskHistories: await ArrayUtil.asyncMap(
        input.taskHistories,
        ErpHrmTaskHistoryTransformer.transform,
      ),
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      estimatedHours: input.estimated_hours,
      dueDate: input.due_date?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
