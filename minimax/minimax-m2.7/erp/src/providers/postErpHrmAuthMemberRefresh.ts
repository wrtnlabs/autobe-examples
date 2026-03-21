import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthMemberRefresh(props: {
  body: IErpHrmMember.IRefresh;
}): Promise<IErpHrmMember.IAuthorized> {
  // 1. Find session by refresh_token
  const session = await MyGlobal.prisma.erp_hrm_member_sessions.findFirst({
    where: { refresh_token: props.body.refresh_token },
  });
  if (!session) {
    throw new HttpException("Invalid refresh token", 401);
  }
  // 2. Check session expiration
  if (session.expired_at < new Date()) {
    throw new HttpException("Session expired", 401);
  }
  // 3. Get member
  const member = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
    where: { id: session.erp_hrm_member_id },
  });
  // 4. Get primary employee (first active employee in any organization)
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: { erp_hrm_member_id: member.id, status: "active" },
    include: {
      role: true,
      organization: { include: { owner: true } },
      department: true,
    },
  });
  if (!employee) {
    throw new HttpException("No active employee found", 400);
  }
  // 5. Get active timers for the employee
  const timers = await MyGlobal.prisma.erp_hrm_timers.findMany({
    where: { erp_hrm_employee_id: employee.id },
    include: {
      project: true,
      task: true,
    },
  });
  // 6. Calculate project summary
  const projectCounts = await MyGlobal.prisma.erp_hrm_projects.groupBy({
    by: ["status"],
    where: { erp_hrm_organization_id: employee.erp_hrm_organization_id },
    _count: { status: true },
  });
  const projectSummary = {
    active:
      projectCounts.find((p) => p.status === "active")?._count.status ?? 0,
    completed:
      projectCounts.find((p) => p.status === "completed")?._count.status ?? 0,
    archived:
      projectCounts.find((p) => p.status === "archived")?._count.status ?? 0,
  };
  // 7. Calculate task overview
  const taskCounts = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["status"],
    where: {
      project: { erp_hrm_organization_id: employee.erp_hrm_organization_id },
    },
    _count: { status: true },
  });
  const priorityCounts = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["priority"],
    where: {
      project: { erp_hrm_organization_id: employee.erp_hrm_organization_id },
    },
    _count: { priority: true },
  });
  const taskOverview = {
    byStatus: {
      open: taskCounts.find((t) => t.status === "open")?._count.status ?? 0,
      inProgress:
        taskCounts.find((t) => t.status === "in-progress")?._count.status ?? 0,
      completed:
        taskCounts.find((t) => t.status === "completed")?._count.status ?? 0,
      closed: taskCounts.find((t) => t.status === "closed")?._count.status ?? 0,
    },
    byPriority: {
      low:
        priorityCounts.find((t) => t.priority === "low")?._count.priority ?? 0,
      medium:
        priorityCounts.find((t) => t.priority === "medium")?._count.priority ??
        0,
      high:
        priorityCounts.find((t) => t.priority === "high")?._count.priority ?? 0,
      urgent:
        priorityCounts.find((t) => t.priority === "urgent")?._count.priority ??
        0,
    },
  };
  // 8. Calculate recent activity
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentTimelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: {
      erp_hrm_employee_id: employee.id,
      created_at: { gte: sevenDaysAgo },
    },
  });
  const recentActivity = {
    timelogsCount: recentTimelogs.length,
    totalHoursThisWeek:
      recentTimelogs.reduce((sum, t) => sum + (t.duration_minutes ?? 0), 0) /
      60.0,
  };
  // 9. Generate new tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 10. Update session with new tokens
  await MyGlobal.prisma.erp_hrm_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expired_at: accessExpires,
      expired_at: refreshExpires,
    },
  });
  // 11. Build and return authorized member
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    avatar_uri: member.avatar_uri,
    phone: member.phone,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    deleted_at: member.deleted_at?.toISOString() ?? null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
    activeTimers: timers.map((timer) => ({
      id: timer.id,
      startedAt: timer.started_at.toISOString(),
      description: timer.description,
      project: {
        id: timer.project.id,
        name: timer.project.name,
        color: timer.project.color,
        status: timer.project.status,
        budget_hours: timer.project.budget_hours,
        start_date: timer.project.start_date?.toISOString() ?? null,
        end_date: timer.project.end_date?.toISOString() ?? null,
        created_at: timer.project.created_at.toISOString(),
        organization: {
          id: timer.project.organization.id,
          name: timer.project.organization.name,
          description: timer.project.organization.description,
          logoUri: timer.project.organization.logo_uri,
          currency: timer.project.organization.currency,
          timezone: timer.project.organization.timezone,
          fiscalStartMonth: timer.project.organization.fiscal_start_month,
          createdAt: timer.project.organization.created_at.toISOString(),
          owner: {
            id: timer.project.organization.owner.id,
            email: timer.project.organization.owner.email,
            displayName: timer.project.organization.owner.display_name,
            avatarUri: timer.project.organization.owner.avatar_uri,
            phone: timer.project.organization.owner.phone,
            createdAt:
              timer.project.organization.owner.created_at.toISOString(),
          },
        },
      },
      task: timer.task
        ? {
            id: timer.task.id,
            title: timer.task.title,
            status: timer.task.status,
            priority: timer.task.priority,
            due_date: timer.task.due_date?.toISOString() ?? null,
            subtasks_count: 0,
            task_histories_count: 0,
            timelogs_count: 0,
            timers_count: 0,
            project: {
              id: timer.project.id,
              name: timer.project.name,
              color: timer.project.color,
              status: timer.project.status,
              budget_hours: timer.project.budget_hours,
              start_date: timer.project.start_date?.toISOString() ?? null,
              end_date: timer.project.end_date?.toISOString() ?? null,
              created_at: timer.project.created_at.toISOString(),
              organization: {
                id: timer.project.organization.id,
                name: timer.project.organization.name,
                description: timer.project.organization.description,
                logoUri: timer.project.organization.logo_uri,
                currency: timer.project.organization.currency,
                timezone: timer.project.organization.timezone,
                fiscalStartMonth: timer.project.organization.fiscal_start_month,
                createdAt: timer.project.organization.created_at.toISOString(),
                owner: {
                  id: timer.project.organization.owner.id,
                  email: timer.project.organization.owner.email,
                  displayName: timer.project.organization.owner.display_name,
                  avatarUri: timer.project.organization.owner.avatar_uri,
                  phone: timer.project.organization.owner.phone,
                  createdAt:
                    timer.project.organization.owner.created_at.toISOString(),
                },
              },
            },
            assignee: undefined,
          }
        : undefined,
    })),
    projectSummary,
    taskOverview,
    recentActivity,
  };
}
