import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmProjectMemberAtSummaryTransformer } from "./ErpHrmProjectMemberAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";
import { ErpHrmTaskHistoryAtSummaryTransformer } from "./ErpHrmTaskHistoryAtSummaryTransformer";
import { ErpHrmTimelogAtSummaryTransformer } from "./ErpHrmTimelogAtSummaryTransformer";
import { ErpHrmTimerAtSummaryTransformer } from "./ErpHrmTimerAtSummaryTransformer";

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
        project: ErpHrmProjectMemberAtSummaryTransformer.select(),
        assignee: ErpHrmEmployeeAtSummaryTransformer.select(),
        parent: ErpHrmTaskAtSummaryTransformer.select(),
        subtasks: ErpHrmTaskAtSummaryTransformer.select(),
        taskHistories: ErpHrmTaskHistoryAtSummaryTransformer.select(),
        timelogs: ErpHrmTimelogAtSummaryTransformer.select(),
        timers: ErpHrmTimerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_tasksFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTask> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? undefined,
      status: input.status,
      priority: input.priority,
      estimated_hours: input.estimated_hours ?? undefined,
      due_date: input.due_date ? toISOStringSafe(input.due_date) : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      project: await ErpHrmProjectMemberAtSummaryTransformer.transform(
        input.project,
      ),
      assignee: input.assignee
        ? await ErpHrmEmployeeAtSummaryTransformer.transform(input.assignee)
        : undefined,
      subtasks: await ArrayUtil.asyncMap(
        input.subtasks,
        ErpHrmTaskAtSummaryTransformer.transform,
      ),
      taskHistories: await ArrayUtil.asyncMap(
        input.taskHistories,
        ErpHrmTaskHistoryAtSummaryTransformer.transform,
      ),
      timelogs: await ArrayUtil.asyncMap(
        input.timelogs,
        ErpHrmTimelogAtSummaryTransformer.transform,
      ),
      timers: await ArrayUtil.asyncMap(
        input.timers,
        ErpHrmTimerAtSummaryTransformer.transform,
      ),
    };
  }
}
