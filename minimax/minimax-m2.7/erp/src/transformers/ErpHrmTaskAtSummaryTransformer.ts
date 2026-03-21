import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmProjectMemberAtSummaryTransformer } from "./ErpHrmProjectMemberAtSummaryTransformer";

export namespace ErpHrmTaskAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.erp_hrm_tasksGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
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
        _count: {
          select: {
            subtasks: true,
            taskHistories: true,
            timelogs: true,
            timers: true,
          },
        },
        project: ErpHrmProjectMemberAtSummaryTransformer.select(),
        assignee: ErpHrmEmployeeAtSummaryTransformer.select(),
        parent: true,
      },
    } satisfies Prisma.erp_hrm_tasksFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTask.ISummary> {
    return {
      id: input.id,
      title: input.title,
      status: input.status,
      priority: input.priority,
      project: await ErpHrmProjectMemberAtSummaryTransformer.transform(
        input.project,
      ),
      assignee: input.assignee
        ? await ErpHrmEmployeeAtSummaryTransformer.transform(input.assignee)
        : undefined,
      due_date: input.due_date ? input.due_date.toISOString() : undefined,
      subtasks_count: input._count.subtasks,
      task_histories_count: input._count.taskHistories,
      timelogs_count: input._count.timelogs,
      timers_count: input._count.timers,
    };
  }
}
