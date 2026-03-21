import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmProjectAtSummaryTransformer } from "./ErpHrmProjectAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";
import { ErpHrmTaskHistoryAtSummaryTransformer } from "./ErpHrmTaskHistoryAtSummaryTransformer";

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
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
        parentTask: ErpHrmTaskAtSummaryTransformer.select(),
        subtasks: ErpHrmTaskAtSummaryTransformer.select(),
        taskHistories: ErpHrmTaskHistoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_tasksFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTask> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      estimatedHours: input.estimated_hours ?? null,
      dueDate: input.due_date?.toISOString() ?? null,
      project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
      employee: input.employee
        ? await ErpHrmEmployeeAtSummaryTransformer.transform(input.employee)
        : null,
      parentTask: input.parentTask
        ? await ErpHrmTaskAtSummaryTransformer.transform(input.parentTask)
        : null,
      subtasks: await ArrayUtil.asyncMap(
        input.subtasks,
        ErpHrmTaskAtSummaryTransformer.transform,
      ),
      histories: await ArrayUtil.asyncMap(
        input.taskHistories,
        ErpHrmTaskHistoryAtSummaryTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
