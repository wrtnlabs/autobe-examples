import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { IErpHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimerSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingTimerSession";
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

export async function patchErpHrmTimeTrackingMemberTimerSessions(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingTimerSession.IRequest;
}): Promise<IPageIErpHrmTimeTrackingTimerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "started_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const baseWhere = {
    deleted_at: null,
  };
  const whereTimer = {
    ...baseWhere,
    employee_id: props.body.employeeId ?? props.member.id,
    ...(props.body.isActive !== undefined
      ? { is_active: props.body.isActive }
      : {}),
    ...(props.body.projectId !== undefined
      ? { project_id: props.body.projectId }
      : {}),
    ...(props.body.taskId !== undefined
      ? props.body.taskId === null
        ? { task_id: null as unknown as string | null }
        : { task_id: props.body.taskId }
      : {}),
    ...(props.body.startedAtFrom !== undefined
      ? {
          started_at: {
            ...(props.body.startedAtTo !== undefined
              ? { gte: props.body.startedAtFrom, lte: props.body.startedAtTo }
              : { gte: props.body.startedAtFrom }),
          },
        }
      : undefined),
    ...(props.body.startedAtFrom === undefined &&
    props.body.startedAtTo !== undefined
      ? { started_at: { lte: props.body.startedAtTo } }
      : undefined),
    ...(props.body.descriptionSearch !== undefined &&
    props.body.descriptionSearch.trim().length > 0
      ? {
          description: {
            contains: props.body.descriptionSearch,
            mode: "insensitive" as const,
          },
        }
      : {}),
  } satisfies Prisma.erp_hrm_time_tracking_timer_sessionsWhereInput;
  const orderByInput = (
    sortBy === "started_at"
      ? { started_at: sortOrder }
      : sortBy === "ended_at"
        ? { ended_at: sortOrder }
        : sortBy === "created_at"
          ? { created_at: sortOrder }
          : { is_active: sortOrder }
  ) satisfies Prisma.erp_hrm_time_tracking_timer_sessionsOrderByWithRelationInput;
  const [rows, total] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_time_tracking_timer_sessions.findMany({
      where: whereTimer,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        description: true,
        started_at: true,
        ended_at: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
            logo_url: true,
            currency_code: true,
            timezone: true,
            fiscal_start_month: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        employee: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            status: true,
            erp_hrm_time_tracking_organization_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
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
            erp_hrm_time_tracking_project_id: true,
          },
        },
      },
    }),
    MyGlobal.prisma.erp_hrm_time_tracking_timer_sessions.count({
      where: whereTimer,
    }),
  ]);
  return {
    data: rows.map((r) => ({
      id: r.id,
      description: r.description,
      started_at: r.started_at.toISOString() as string &
        tags.Format<"date-time">,
      ended_at: r.ended_at
        ? (r.ended_at.toISOString() as string & tags.Format<"date-time">)
        : null,
      is_active: r.is_active,
      created_at: r.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: r.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      deleted_at: r.deleted_at
        ? (r.deleted_at.toISOString() as string & tags.Format<"date-time">)
        : null,
      organization: {
        id: r.organization.id,
        name: r.organization.name,
        description: r.organization.description,
        logo_url: r.organization.logo_url,
        currency_code: r.organization.currency_code,
        timezone: r.organization.timezone,
        fiscal_start_month: r.organization.fiscal_start_month,
        created_at: r.organization.created_at.toISOString() as string &
          tags.Format<"date-time">,
        updated_at: r.organization.updated_at.toISOString() as string &
          tags.Format<"date-time">,
        deleted_at: r.organization.deleted_at
          ? (r.organization.deleted_at.toISOString() as string &
              tags.Format<"date-time">)
          : null,
      },
      member: {
        id: r.employee.id,
        email: r.employee.email,
        created_at: r.employee.created_at.toISOString() as string &
          tags.Format<"date-time">,
        updated_at: r.employee.updated_at.toISOString() as string &
          tags.Format<"date-time">,
        deleted_at: r.employee.deleted_at
          ? (r.employee.deleted_at.toISOString() as string &
              tags.Format<"date-time">)
          : null,
      },
      project: {
        id: r.project.id,
        name: r.project.name,
        color: r.project.color,
        status: r.project.status,
        erp_hrm_time_tracking_organization_id:
          r.project.erp_hrm_time_tracking_organization_id,
        created_at: r.project.created_at.toISOString() as string &
          tags.Format<"date-time">,
        updated_at: r.project.updated_at.toISOString() as string &
          tags.Format<"date-time">,
        deleted_at: r.project.deleted_at
          ? (r.project.deleted_at.toISOString() as string &
              tags.Format<"date-time">)
          : null,
      },
      task: r.task
        ? {
            id: r.task.id,
            title: r.task.title,
            description: r.task.description,
            status: r.task.status,
            priority: r.task.priority,
            estimated_hours: r.task.estimated_hours,
            due_date: r.task.due_date
              ? (r.task.due_date.toISOString() as string &
                  tags.Format<"date-time">)
              : null,
            project: {
              id: r.task.erp_hrm_time_tracking_project_id,
              name: "" as string,
              color: "" as string,
              status: "" as string,
              erp_hrm_time_tracking_organization_id: "" as string,
              created_at: "" as string & tags.Format<"date-time">,
              updated_at: "" as string & tags.Format<"date-time">,
              deleted_at: null,
            },
            parent_task: null,
            assigned_employee: null,
            created_at: r.task.created_at.toISOString() as string &
              tags.Format<"date-time">,
            updated_at: r.task.updated_at.toISOString() as string &
              tags.Format<"date-time">,
            deleted_at: r.task.deleted_at
              ? (r.task.deleted_at.toISOString() as string &
                  tags.Format<"date-time">)
              : null,
          }
        : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
