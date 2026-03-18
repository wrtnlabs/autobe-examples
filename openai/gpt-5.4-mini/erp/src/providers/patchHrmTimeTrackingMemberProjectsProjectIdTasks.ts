import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTask";
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

export async function patchHrmTimeTrackingMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTask.IRequest;
}): Promise<IPageIHrmTimeTrackingTask.ISummary> {
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: props.projectId,
        organization: {
          employees: {
            some: {
              id: props.member.id,
              deleted_at: null,
            },
          },
        },
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const whereInput = {
    hrm_time_tracking_project_id: project.id,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.priority !== undefined && { priority: props.body.priority }),
    ...(props.body.assigneeId !== undefined && {
      hrm_time_tracking_employee_id: props.body.assigneeId,
    }),
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? {
          OR: [
            { title: { contains: props.body.search, mode: "insensitive" } },
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }
      : {}),
  } satisfies Prisma.hrm_time_tracking_tasksWhereInput;
  const orderByInput = (
    props.body.sort === "dueDateAsc"
      ? [{ due_date: "asc" }, { created_at: "asc" }, { id: "asc" }]
      : props.body.sort === "dueDateDesc"
        ? [{ due_date: "desc" }, { created_at: "desc" }, { id: "desc" }]
        : props.body.sort === "priorityAsc"
          ? [{ priority: "asc" }, { created_at: "asc" }, { id: "asc" }]
          : props.body.sort === "priorityDesc"
            ? [{ priority: "desc" }, { created_at: "desc" }, { id: "desc" }]
            : props.body.sort === "createdAtAsc"
              ? [{ created_at: "asc" }, { id: "asc" }]
              : [{ created_at: "desc" }, { id: "desc" }]
  ) satisfies Prisma.hrm_time_tracking_tasksOrderByWithRelationInput[];
  const total = await MyGlobal.prisma.hrm_time_tracking_tasks.count({
    where: whereInput,
  });
  const data = await MyGlobal.prisma.hrm_time_tracking_tasks.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
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
        },
      },
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((row) => ({
      id: row.id,
      project: {
        id: row.project.id,
        organization: {
          id: row.project.organization.id,
          name: row.project.organization.name,
          description: row.project.organization.description,
          logoImageUrl: row.project.organization.logo_image_url,
          currency: row.project.organization.currency,
          timezone: row.project.organization.timezone,
          fiscalStartMonth: row.project.organization.fiscal_start_month,
          createdAt: toISOStringSafe(row.project.organization.created_at),
          updatedAt: toISOStringSafe(row.project.organization.updated_at),
          deletedAt:
            row.project.organization.deleted_at === null
              ? null
              : toISOStringSafe(row.project.organization.deleted_at),
        },
        name: row.project.name,
        description: row.project.description,
        colorCode: row.project.color_code,
        status: row.project.status,
        budgetHours: row.project.budget_hours,
        startDate:
          row.project.start_date === null
            ? null
            : toISOStringSafe(row.project.start_date),
        endDate:
          row.project.end_date === null
            ? null
            : toISOStringSafe(row.project.end_date),
        createdAt: toISOStringSafe(row.project.created_at),
        updatedAt: toISOStringSafe(row.project.updated_at),
        deletedAt:
          row.project.deleted_at === null
            ? null
            : toISOStringSafe(row.project.deleted_at),
      },
      assignee: null,
      parent: null,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      estimated_hours: row.estimated_hours,
      due_date: row.due_date === null ? null : toISOStringSafe(row.due_date),
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
    })),
  };
}
