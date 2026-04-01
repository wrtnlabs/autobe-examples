import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeEmployeeAtSummaryTransformer } from "./ErpHrmTimeEmployeeAtSummaryTransformer";
import { ErpHrmTimeProjectAtSummaryTransformer } from "./ErpHrmTimeProjectAtSummaryTransformer";
import { ErpHrmTimeTaskAtSummaryTransformer } from "./ErpHrmTimeTaskAtSummaryTransformer";

export namespace ErpHrmTimeTaskTransformer {
  export type Payload = Prisma.erp_hrm_time_tasksGetPayload<
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
        erp_hrm_time_project_id: true,
        erp_hrm_time_employee_id: true,
        parent_task_id: true,
        project: ErpHrmTimeProjectAtSummaryTransformer.select(),
        employee: ErpHrmTimeEmployeeAtSummaryTransformer.select(),
        parentTask: ErpHrmTimeTaskAtSummaryTransformer.select(),
        subTasks: ErpHrmTimeTaskAtSummaryTransformer.select(),
        historyEntries: true,
        timelogs: true,
        timers: true,
        timeReportRows: true,
      },
    } satisfies Prisma.erp_hrm_time_tasksFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTimeTask> {
    return {
      id: input.id,
      project: await ErpHrmTimeProjectAtSummaryTransformer.transform(
        input.project,
      ),
      employee:
        input.employee === null
          ? null
          : await ErpHrmTimeEmployeeAtSummaryTransformer.transform(
              input.employee,
            ),
      parentTask:
        input.parentTask === null
          ? null
          : await ErpHrmTimeTaskAtSummaryTransformer.transform(
              input.parentTask,
            ),
      erp_hrm_time_project_id: input.erp_hrm_time_project_id !== null,
      erp_hrm_time_employee_id: input.erp_hrm_time_employee_id !== null,
      parent_task_id: input.parent_task_id !== null,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      estimatedHours: input.estimated_hours,
      dueDate: input.due_date ? toISOStringSafe(input.due_date) : null,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
