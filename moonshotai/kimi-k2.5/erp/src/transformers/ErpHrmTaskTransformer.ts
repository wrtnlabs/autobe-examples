import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";
import { ErpHrmProjectAtSummaryTransformer } from "./ErpHrmProjectAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";

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
        due_date: true,
        estimated_hours: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        project: ErpHrmProjectAtSummaryTransformer.select(),
        assignee: ErpHrmOrganizationMemberAtSummaryTransformer.select(),
        parentTask: ErpHrmTaskAtSummaryTransformer.select(),
        childTasks: ErpHrmTaskAtSummaryTransformer.select(),
        histories: {
          select: {
            id: true,
            previous_status: true,
            new_status: true,
            change_reason: true,
            created_at: true,
            changedByMember: {
              select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
                created_at: true,
              },
            } satisfies Prisma.erp_hrm_membersFindManyArgs,
          },
        } satisfies Prisma.erp_hrm_task_historiesFindManyArgs,
        timelogs: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_timelogsFindManyArgs,
        timers: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_timersFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_tasksFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTask> {
    return {
      id: input.id,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueDate: input.due_date?.toISOString() ?? null,
      estimatedHours: input.estimated_hours,
      project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
      assignee: input.assignee
        ? await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
            input.assignee,
          )
        : null,
      parentTask: input.parentTask
        ? await ErpHrmTaskAtSummaryTransformer.transform(input.parentTask)
        : null,
      childTasks: await ArrayUtil.asyncMap(
        input.childTasks,
        ErpHrmTaskAtSummaryTransformer.transform,
      ),
      histories: await ArrayUtil.asyncMap(
        input.histories,
        async (h) =>
          ({
            id: h.id,
            previous_status: h.previous_status,
            new_status: h.new_status,
            change_reason: h.change_reason,
            changed_by: {
              id: h.changedByMember.id,
              email: h.changedByMember.email,
              firstName: h.changedByMember.first_name,
              lastName: h.changedByMember.last_name,
              avatarUrl: h.changedByMember.avatar_url,
              createdAt: h.changedByMember.created_at.toISOString(),
            } satisfies IErpHrmMember.ISummary,
            created_at: h.created_at.toISOString(),
          }) satisfies IErpHrmTaskHistory.ISummary,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
