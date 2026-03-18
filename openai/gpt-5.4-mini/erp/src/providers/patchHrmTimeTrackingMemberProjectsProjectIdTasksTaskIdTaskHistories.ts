import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberProjectsProjectIdTasksTaskIdTaskHistories(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTaskHistory.IRequest;
}): Promise<IPageIHrmTimeTrackingTaskHistory.ISummary> {
  await MyGlobal.prisma.hrm_time_tracking_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
    },
    select: {
      id: true,
      hrm_time_tracking_project_id: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const histories =
    await MyGlobal.prisma.hrm_time_tracking_task_histories.findMany({
      where: {
        hrm_time_tracking_task_id: props.taskId,
        task: {
          hrm_time_tracking_project_id: props.projectId,
        },
      },
      orderBy: {
        changed_at: "asc",
      },
      skip,
      take: limit,
      select: {
        id: true,
        from_status: true,
        to_status: true,
        changed_at: true,
        task: {
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
            project: {
              select: {
                id: true,
                name: true,
                description: true,
                color_code: true,
                status: true,
                budget_hours: true,
                start_date: true,
                end_date: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    logo_image_url: true,
                    currency: true,
                    timezone: true,
                    fiscal_start_month: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
              },
            },
          },
        },
        member: {
          select: {
            id: true,
            email: true,
            is_active: true,
            last_login_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  const total: number =
    await MyGlobal.prisma.hrm_time_tracking_task_histories.count({
      where: {
        hrm_time_tracking_task_id: props.taskId,
        task: {
          hrm_time_tracking_project_id: props.projectId,
        },
      },
    });
  return {
    data: await ArrayUtil.asyncMap(histories, async (history) => {
      const projectDeletedAt =
        history.task.project.deleted_at ?? new Date("9999-12-31T23:59:59.999Z");
      const organizationDeletedAt =
        history.task.project.organization.deleted_at ??
        new Date("9999-12-31T23:59:59.999Z");
      const taskDeletedAt =
        history.task.deleted_at ?? new Date("9999-12-31T23:59:59.999Z");
      const dueDate =
        history.task.due_date ?? new Date("9999-12-31T23:59:59.999Z");
      return {
        id: history.id,
        from_status: history.from_status,
        to_status: history.to_status,
        changed_at: toISOStringSafe(history.changed_at),
        member: {
          id: history.member.id,
          email: history.member.email,
          is_active: history.member.is_active,
          last_login_at:
            history.member.last_login_at === null
              ? null
              : toISOStringSafe(history.member.last_login_at),
          created_at: toISOStringSafe(history.member.created_at),
          updated_at: toISOStringSafe(history.member.updated_at),
          deleted_at: toISOStringSafe(
            history.member.deleted_at ?? new Date("9999-12-31T23:59:59.999Z"),
          ),
        } satisfies IHrmTimeTrackingMember.ISummary,
        task: {
          id: history.task.id,
          title: history.task.title,
          description: history.task.description,
          status: history.task.status,
          priority: history.task.priority,
          estimated_hours: history.task.estimated_hours,
          assignee: null,
          parent: null,
          due_date: toISOStringSafe(dueDate),
          created_at: toISOStringSafe(history.task.created_at),
          updated_at: toISOStringSafe(history.task.updated_at),
          deleted_at: toISOStringSafe(taskDeletedAt),
          project: {
            id: history.task.project.id,
            name: history.task.project.name,
            description: history.task.project.description,
            colorCode: history.task.project.color_code,
            status: history.task.project.status,
            budgetHours: history.task.project.budget_hours,
            startDate: toISOStringSafe(
              history.task.project.start_date ??
                new Date("9999-12-31T23:59:59.999Z"),
            ),
            endDate: toISOStringSafe(
              history.task.project.end_date ??
                new Date("9999-12-31T23:59:59.999Z"),
            ),
            createdAt: toISOStringSafe(history.task.project.created_at),
            updatedAt: toISOStringSafe(history.task.project.updated_at),
            deletedAt: toISOStringSafe(projectDeletedAt),
            organization: {
              id: history.task.project.organization.id,
              name: history.task.project.organization.name,
              description: history.task.project.organization.description,
              logoImageUrl: history.task.project.organization.logo_image_url,
              currency: history.task.project.organization.currency,
              timezone: history.task.project.organization.timezone,
              fiscalStartMonth:
                history.task.project.organization.fiscal_start_month,
              createdAt: toISOStringSafe(
                history.task.project.organization.created_at,
              ),
              updatedAt: toISOStringSafe(
                history.task.project.organization.updated_at,
              ),
              deletedAt: toISOStringSafe(organizationDeletedAt),
            } satisfies IHrmTimeTrackingOrganization.ISummary,
          } satisfies IHrmTimeTrackingProject.ISummary,
        } satisfies IHrmTimeTrackingTask.ISummary,
      } satisfies IHrmTimeTrackingTaskHistory.ISummary;
    }),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
