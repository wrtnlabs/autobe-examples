import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
import { IHrmPlatformDashboardIOrgMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboardIOrgMetric";
import { IHrmPlatformDashboardIPersonalMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboardIPersonalMetric";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
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

export async function patchHrmPlatformMemberDashboard(props: {
  member: MemberPayload;
  body: IHrmPlatformDashboard.IRequest;
}): Promise<IHrmPlatformDashboard.IResponse> {
  const employeeRecord = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_member_id: props.member.id,
        deleted_at: null,
        status: "active",
      },
      select: { id: true, hrm_platform_organization_id: true },
    },
  );
  if (!employeeRecord) {
    throw new HttpException("Employee not found", 404);
  }
  const nowDate = new Date();
  const todayStart = new Date(
    Date.UTC(
      nowDate.getUTCFullYear(),
      nowDate.getUTCMonth(),
      nowDate.getUTCDate(),
    ),
  );
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
  if (props.body.dashboard_type === "personal") {
    const hoursResult = await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: {
        employee_id: employeeRecord.id,
        deleted_at: null,
        start_datetime: { gte: todayStart, lt: todayEnd },
      },
      _sum: { duration_minutes: true },
    });
    const hours_logged_today: number & tags.Type<"int32"> =
      hoursResult._sum.duration_minutes || 0;
    let activeTimer: IHrmPlatformTimer.ISummary | null = null;
    const timerQuery = await MyGlobal.prisma.hrm_platform_timers.findFirst({
      where: {
        hrm_platform_employee_id: employeeRecord.id,
        status: { in: ["started", "paused"] },
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      include: {
        project: true,
        task: { include: { project: true } },
      },
    });
    if (timerQuery) {
      const timerId: string & tags.Format<"uuid"> = timerQuery.id;
      activeTimer = {
        id: timerId,
        status: timerQuery.status,
        lastTickAt: toISOStringSafe(timerQuery.last_tick_at),
        durationSeconds: timerQuery.duration_seconds,
        createdAt: toISOStringSafe(timerQuery.created_at),
        updatedAt: toISOStringSafe(timerQuery.updated_at),
        deletedAt: timerQuery.deleted_at
          ? toISOStringSafe(timerQuery.deleted_at)
          : null,
        project: timerQuery.project
          ? ({
              id: timerQuery.project.id,
              name: timerQuery.project.name,
              status: timerQuery.project.status,
              color_code: timerQuery.project.color_code,
              budget_hours: timerQuery.project.budget_hours,
              start_date: timerQuery.project.start_date
                ? toISOStringSafe(timerQuery.project.start_date)
                : undefined,
              end_date: timerQuery.project.end_date
                ? toISOStringSafe(timerQuery.project.end_date)
                : undefined,
              description: timerQuery.project.description ?? undefined,
              created_at: toISOStringSafe(timerQuery.project.created_at),
              updated_at: toISOStringSafe(timerQuery.project.updated_at),
              total_hours: 0,
              billable_hours: 0,
              non_billable_hours: 0,
              timelog_count: 0,
              employee_count: 0,
            } satisfies IHrmPlatformProject.ISummary)
          : null,
        task: timerQuery.task
          ? ({
              id: timerQuery.task.id,
              title: timerQuery.task.title,
              status: timerQuery.task.status,
              priority: timerQuery.task.priority,
              created_at: toISOStringSafe(timerQuery.task.created_at),
              due_date: timerQuery.task.due_date
                ? toISOStringSafe(timerQuery.task.due_date)
                : undefined,
              project: timerQuery.task.project
                ? ({
                    id: timerQuery.task.project.id,
                    name: timerQuery.task.project.name,
                    status: timerQuery.task.project.status,
                    color_code: timerQuery.task.project.color_code,
                    budget_hours: timerQuery.task.project.budget_hours,
                    start_date: timerQuery.task.project.start_date
                      ? toISOStringSafe(timerQuery.task.project.start_date)
                      : undefined,
                    end_date: timerQuery.task.project.end_date
                      ? toISOStringSafe(timerQuery.task.project.end_date)
                      : undefined,
                    description:
                      timerQuery.task.project.description ?? undefined,
                    created_at: toISOStringSafe(
                      timerQuery.task.project.created_at,
                    ),
                    updated_at: toISOStringSafe(
                      timerQuery.task.project.updated_at,
                    ),
                    total_hours: 0,
                    billable_hours: 0,
                    non_billable_hours: 0,
                    timelog_count: 0,
                    employee_count: 0,
                  } satisfies IHrmPlatformProject.ISummary)
                : null,
            } satisfies IHrmPlatformTask.ISummary)
          : null,
      } satisfies IHrmPlatformTimer.ISummary;
    }
    const recentTimelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany(
      {
        where: { employee_id: employeeRecord.id, deleted_at: null },
        orderBy: { created_at: "desc" },
        take: 5,
        include: {
          project: true,
          task: { include: { project: true } },
          employee: {
            include: {
              member: true,
              role: true,
              department: true,
              organization: true,
            },
          },
        },
      },
    );
    const recent_timelogs: IHrmPlatformTimelog.ISummary[] = recentTimelogs.map(
      (tl) => {
        const tlId: string & tags.Format<"uuid"> = tl.id;
        const employeeId: string & tags.Format<"uuid"> = tl.employee.id;
        return {
          id: tlId,
          start_datetime: toISOStringSafe(tl.start_datetime),
          end_datetime: toISOStringSafe(tl.end_datetime),
          duration_minutes: tl.duration_minutes,
          billable: tl.billable,
          description: tl.description ?? undefined,
          employee: {
            id: employeeId,
            employee_code: tl.employee.employee_code,
            display_name: tl.employee.display_name,
            email: tl.employee.email,
            job_level: tl.employee.job_level,
            employment_type: tl.employee.employment_type,
            status: tl.employee.status,
            start_date: toISOStringSafe(tl.employee.start_date),
            end_date: tl.employee.end_date
              ? toISOStringSafe(tl.employee.end_date)
              : undefined,
            is_pending: tl.employee.is_pending,
            created_at: toISOStringSafe(tl.employee.created_at),
            updated_at: toISOStringSafe(tl.employee.updated_at),
            deleted_at: tl.employee.deleted_at
              ? toISOStringSafe(tl.employee.deleted_at)
              : null,
            department: tl.employee.department
              ? ({
                  id: tl.employee.department.id,
                  name: tl.employee.department.name,
                  organization: tl.employee.department.organization
                    ? ({
                        id: tl.employee.department.organization.id,
                        name: tl.employee.department.organization.name,
                        description:
                          tl.employee.department.organization.description ??
                          undefined,
                        currency:
                          tl.employee.department.organization.currency ??
                          undefined,
                        timezone:
                          tl.employee.department.organization.timezone ??
                          undefined,
                        fiscal_start_month:
                          tl.employee.department.organization
                            .fiscal_start_month ?? undefined,
                        created_at: toISOStringSafe(
                          tl.employee.department.organization.created_at,
                        ),
                        updated_at: toISOStringSafe(
                          tl.employee.department.organization.updated_at,
                        ),
                        deleted_at: tl.employee.department.organization
                          .deleted_at
                          ? toISOStringSafe(
                              tl.employee.department.organization.deleted_at,
                            )
                          : null,
                        owner: tl.employee.department.organization.owner
                          ? ({
                              id: tl.employee.department.organization.owner.id,
                              email:
                                tl.employee.department.organization.owner.email,
                              display_name:
                                tl.employee.department.organization.owner
                                  .display_name ?? undefined,
                              avatar_uri:
                                tl.employee.department.organization.owner
                                  .avatar_uri ?? undefined,
                              phone_number:
                                tl.employee.department.organization.owner
                                  .phone_number ?? undefined,
                              is_active:
                                tl.employee.department.organization.owner
                                  .is_active,
                              last_login_at: tl.employee.department.organization
                                .owner.last_login_at
                                ? toISOStringSafe(
                                    tl.employee.department.organization.owner
                                      .last_login_at,
                                  )
                                : undefined,
                              created_at: toISOStringSafe(
                                tl.employee.department.organization.owner
                                  .created_at,
                              ),
                              updated_at: toISOStringSafe(
                                tl.employee.department.organization.owner
                                  .updated_at,
                              ),
                              deleted_at:
                                tl.employee.department.organization.owner
                                  .deleted_at ?? undefined,
                            } satisfies IHrmPlatformMember.ISummary)
                          : null,
                      } satisfies IHrmPlatformOrganization.ISummary)
                    : null,
                  parentDepartment: tl.employee.department.parentDepartment
                    ? ({
                        id: tl.employee.department.parentDepartment.id,
                        name: tl.employee.department.parentDepartment.name,
                        organization: tl.employee.department.parentDepartment
                          .organization
                          ? ({
                              id: tl.employee.department.parentDepartment
                                .organization.id,
                              name: tl.employee.department.parentDepartment
                                .organization.name,
                              description:
                                tl.employee.department.parentDepartment
                                  .organization.description ?? undefined,
                              currency:
                                tl.employee.department.parentDepartment
                                  .organization.currency ?? undefined,
                              timezone:
                                tl.employee.department.parentDepartment
                                  .organization.timezone ?? undefined,
                              fiscal_start_month:
                                tl.employee.department.parentDepartment
                                  .organization.fiscal_start_month ?? undefined,
                              created_at: toISOStringSafe(
                                tl.employee.department.parentDepartment
                                  .organization.created_at,
                              ),
                              updated_at: toISOStringSafe(
                                tl.employee.department.parentDepartment
                                  .organization.updated_at,
                              ),
                              deleted_at: tl.employee.department
                                .parentDepartment.organization.deleted_at
                                ? toISOStringSafe(
                                    tl.employee.department.parentDepartment
                                      .organization.deleted_at,
                                  )
                                : null,
                              owner:
                                tl.employee.department.parentDepartment
                                  .organization.owner ?? null,
                            } satisfies IHrmPlatformOrganization.ISummary)
                          : null,
                        created_at: toISOStringSafe(
                          tl.employee.department.parentDepartment.created_at,
                        ),
                        updated_at: toISOStringSafe(
                          tl.employee.department.parentDepartment.updated_at,
                        ),
                      } satisfies IHrmPlatformDepartment.ISummary)
                    : null,
                  created_at: toISOStringSafe(
                    tl.employee.department.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    tl.employee.department.updated_at,
                  ),
                } satisfies IHrmPlatformDepartment.ISummary)
              : null,
            organization: tl.employee.organization
              ? ({
                  id: tl.employee.organization.id,
                  name: tl.employee.organization.name,
                  description:
                    tl.employee.organization.description ?? undefined,
                  currency: tl.employee.organization.currency ?? undefined,
                  timezone: tl.employee.organization.timezone ?? undefined,
                  fiscal_start_month:
                    tl.employee.organization.fiscal_start_month ?? undefined,
                  created_at: toISOStringSafe(
                    tl.employee.organization.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    tl.employee.organization.updated_at,
                  ),
                  deleted_at: tl.employee.organization.deleted_at
                    ? toISOStringSafe(tl.employee.organization.deleted_at)
                    : null,
                  owner: tl.employee.organization.owner ?? null,
                } satisfies IHrmPlatformOrganization.ISummary)
              : null,
            member: {
              id: tl.employee.member.id,
              email: tl.employee.member.email,
              display_name: tl.employee.member.display_name ?? undefined,
              avatar_uri: tl.employee.member.avatar_uri ?? undefined,
              phone_number: tl.employee.member.phone_number ?? undefined,
              is_active: tl.employee.member.is_active,
              last_login_at: tl.employee.member.last_login_at
                ? toISOStringSafe(tl.employee.member.last_login_at)
                : undefined,
              created_at: toISOStringSafe(tl.employee.member.created_at),
              updated_at: toISOStringSafe(tl.employee.member.updated_at),
              deleted_at: tl.employee.member.deleted_at
                ? toISOStringSafe(tl.employee.member.deleted_at)
                : undefined,
            } satisfies IHrmPlatformMember.ISummary,
            role: {
              id: tl.employee.role.id,
              name: tl.employee.role.name,
              role_kind: tl.employee.role.role_kind,
              organization: tl.employee.role.organization
                ? ({
                    id: tl.employee.role.organization.id,
                    name: tl.employee.role.organization.name,
                    description:
                      tl.employee.role.organization.description ?? undefined,
                    currency:
                      tl.employee.role.organization.currency ?? undefined,
                    timezone:
                      tl.employee.role.organization.timezone ?? undefined,
                    fiscal_start_month:
                      tl.employee.role.organization.fiscal_start_month ??
                      undefined,
                    created_at: toISOStringSafe(
                      tl.employee.role.organization.created_at,
                    ),
                    updated_at: toISOStringSafe(
                      tl.employee.role.organization.updated_at,
                    ),
                    deleted_at: tl.employee.role.organization.deleted_at
                      ? toISOStringSafe(
                          tl.employee.role.organization.deleted_at,
                        )
                      : null,
                    owner: tl.employee.role.organization.owner ?? null,
                  } satisfies IHrmPlatformOrganization.ISummary)
                : null,
              permissions_count: 0,
            } satisfies IHrmPlatformRole.ISummary,
          } satisfies IHrmPlatformEmployee.ISummary,
          project: {
            id: tl.project.id,
            name: tl.project.name,
            status: tl.project.status,
            color_code: tl.project.color_code,
            budget_hours: tl.project.budget_hours,
            start_date: tl.project.start_date
              ? toISOStringSafe(tl.project.start_date)
              : undefined,
            end_date: tl.project.end_date
              ? toISOStringSafe(tl.project.end_date)
              : undefined,
            description: tl.project.description ?? undefined,
            created_at: toISOStringSafe(tl.project.created_at),
            updated_at: toISOStringSafe(tl.project.updated_at),
            total_hours: 0,
            billable_hours: 0,
            non_billable_hours: 0,
            timelog_count: 0,
            employee_count: 0,
          } satisfies IHrmPlatformProject.ISummary,
          task: tl.task
            ? ({
                id: tl.task.id,
                title: tl.task.title,
                status: tl.task.status,
                priority: tl.task.priority,
                created_at: toISOStringSafe(tl.task.created_at),
                due_date: tl.task.due_date
                  ? toISOStringSafe(tl.task.due_date)
                  : undefined,
                project: tl.task.project
                  ? ({
                      id: tl.task.project.id,
                      name: tl.task.project.name,
                      status: tl.task.project.status,
                      color_code: tl.task.project.color_code,
                      budget_hours: tl.task.project.budget_hours,
                      start_date: tl.task.project.start_date
                        ? toISOStringSafe(tl.task.project.start_date)
                        : undefined,
                      end_date: tl.task.project.end_date
                        ? toISOStringSafe(tl.task.project.end_date)
                        : undefined,
                      description: tl.task.project.description ?? undefined,
                      created_at: toISOStringSafe(tl.task.project.created_at),
                      updated_at: toISOStringSafe(tl.task.project.updated_at),
                      total_hours: 0,
                      billable_hours: 0,
                      non_billable_hours: 0,
                      timelog_count: 0,
                      employee_count: 0,
                    } satisfies IHrmPlatformProject.ISummary)
                  : null,
              } satisfies IHrmPlatformTask.ISummary)
            : null,
        } satisfies IHrmPlatformTimelog.ISummary;
      },
    );
    const dayOfWeek = nowDate.getUTCDay();
    const mondayOffset =
      nowDate.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(
      Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), mondayOffset),
    );
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    const timesheet = await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        hrm_platform_employee_id: employeeRecord.id,
        start_date: { lte: nowDate },
        end_date: { gte: nowDate },
        deleted_at: null,
      },
      orderBy: { start_date: "desc" },
    });
    const pending_timesheet_status = timesheet
      ? {
          status: timesheet.status as
            | "pending"
            | "submitted"
            | "approved"
            | "rejected"
            | "cancelled",
          rejection_reason: timesheet.status === "rejected" ? null : null,
        }
      : {
          status: "pending" as const,
          rejection_reason: null,
        };
    const assignedTasks = await MyGlobal.prisma.hrm_platform_tasks.findMany({
      where: {
        assigned_employee_id: employeeRecord.id,
        status: { in: ["IN_PROGRESS", "TODO"] },
        deleted_at: null,
      },
      orderBy: [{ due_date: "asc" }, { priority: "desc" }],
      include: {
        project: true,
        assignedEmployee: {
          include: {
            member: true,
            role: true,
            department: true,
            organization: true,
          },
        },
      },
    });
    const assigned_tasks: IHrmPlatformTask.ISummary[] = assignedTasks.map(
      (task) => {
        const taskId: string & tags.Format<"uuid"> = task.id;
        return {
          id: taskId,
          title: task.title,
          status: task.status,
          priority: task.priority,
          created_at: toISOStringSafe(task.created_at),
          due_date: task.due_date ? toISOStringSafe(task.due_date) : undefined,
          project: {
            id: task.project.id,
            name: task.project.name,
            status: task.project.status,
            color_code: task.project.color_code,
            budget_hours: task.project.budget_hours,
            start_date: task.project.start_date
              ? toISOStringSafe(task.project.start_date)
              : undefined,
            end_date: task.project.end_date
              ? toISOStringSafe(task.project.end_date)
              : undefined,
            description: task.project.description ?? undefined,
            created_at: toISOStringSafe(task.project.created_at),
            updated_at: toISOStringSafe(task.project.updated_at),
            total_hours: 0,
            billable_hours: 0,
            non_billable_hours: 0,
            timelog_count: 0,
            employee_count: 0,
          } satisfies IHrmPlatformProject.ISummary,
          assignedEmployee: task.assignedEmployee
            ? ({
                id: task.assignedEmployee.id,
                employee_code: task.assignedEmployee.employee_code,
                display_name: task.assignedEmployee.display_name,
                email: task.assignedEmployee.email,
                job_level: task.assignedEmployee.job_level,
                employment_type: task.assignedEmployee.employment_type,
                status: task.assignedEmployee.status,
                start_date: toISOStringSafe(task.assignedEmployee.start_date),
                end_date: task.assignedEmployee.end_date
                  ? toISOStringSafe(task.assignedEmployee.end_date)
                  : undefined,
                is_pending: task.assignedEmployee.is_pending,
                created_at: toISOStringSafe(task.assignedEmployee.created_at),
                updated_at: toISOStringSafe(task.assignedEmployee.updated_at),
                deleted_at: task.assignedEmployee.deleted_at
                  ? toISOStringSafe(task.assignedEmployee.deleted_at)
                  : null,
                department: task.assignedEmployee.department
                  ? ({
                      id: task.assignedEmployee.department.id,
                      name: task.assignedEmployee.department.name,
                      organization: task.assignedEmployee.department
                        .organization
                        ? ({
                            id: task.assignedEmployee.department.organization
                              .id,
                            name: task.assignedEmployee.department.organization
                              .name,
                            description:
                              task.assignedEmployee.department.organization
                                .description ?? undefined,
                            currency:
                              task.assignedEmployee.department.organization
                                .currency ?? undefined,
                            timezone:
                              task.assignedEmployee.department.organization
                                .timezone ?? undefined,
                            fiscal_start_month:
                              task.assignedEmployee.department.organization
                                .fiscal_start_month ?? undefined,
                            created_at: toISOStringSafe(
                              task.assignedEmployee.department.organization
                                .created_at,
                            ),
                            updated_at: toISOStringSafe(
                              task.assignedEmployee.department.organization
                                .updated_at,
                            ),
                            deleted_at: task.assignedEmployee.department
                              .organization.deleted_at
                              ? toISOStringSafe(
                                  task.assignedEmployee.department.organization
                                    .deleted_at,
                                )
                              : null,
                            owner:
                              task.assignedEmployee.department.organization
                                .owner ?? null,
                          } satisfies IHrmPlatformOrganization.ISummary)
                        : null,
                      parentDepartment: task.assignedEmployee.department
                        .parentDepartment
                        ? ({
                            id: task.assignedEmployee.department
                              .parentDepartment.id,
                            name: task.assignedEmployee.department
                              .parentDepartment.name,
                            organization: task.assignedEmployee.department
                              .parentDepartment.organization
                              ? ({
                                  id: task.assignedEmployee.department
                                    .parentDepartment.organization.id,
                                  name: task.assignedEmployee.department
                                    .parentDepartment.organization.name,
                                  description:
                                    task.assignedEmployee.department
                                      .parentDepartment.organization
                                      .description ?? undefined,
                                  currency:
                                    task.assignedEmployee.department
                                      .parentDepartment.organization.currency ??
                                    undefined,
                                  timezone:
                                    task.assignedEmployee.department
                                      .parentDepartment.organization.timezone ??
                                    undefined,
                                  fiscal_start_month:
                                    task.assignedEmployee.department
                                      .parentDepartment.organization
                                      .fiscal_start_month ?? undefined,
                                  created_at: toISOStringSafe(
                                    task.assignedEmployee.department
                                      .parentDepartment.organization.created_at,
                                  ),
                                  updated_at: toISOStringSafe(
                                    task.assignedEmployee.department
                                      .parentDepartment.organization.updated_at,
                                  ),
                                  deleted_at: task.assignedEmployee.department
                                    .parentDepartment.organization.deleted_at
                                    ? toISOStringSafe(
                                        task.assignedEmployee.department
                                          .parentDepartment.organization
                                          .deleted_at,
                                      )
                                    : null,
                                  owner:
                                    task.assignedEmployee.department
                                      .parentDepartment.organization.owner ??
                                    null,
                                } satisfies IHrmPlatformOrganization.ISummary)
                              : null,
                            created_at: toISOStringSafe(
                              task.assignedEmployee.department.parentDepartment
                                .created_at,
                            ),
                            updated_at: toISOStringSafe(
                              task.assignedEmployee.department.parentDepartment
                                .updated_at,
                            ),
                          } satisfies IHrmPlatformDepartment.ISummary)
                        : null,
                      created_at: toISOStringSafe(
                        task.assignedEmployee.department.created_at,
                      ),
                      updated_at: toISOStringSafe(
                        task.assignedEmployee.department.updated_at,
                      ),
                    } satisfies IHrmPlatformDepartment.ISummary)
                  : null,
                organization: task.assignedEmployee.organization
                  ? ({
                      id: task.assignedEmployee.organization.id,
                      name: task.assignedEmployee.organization.name,
                      description:
                        task.assignedEmployee.organization.description ??
                        undefined,
                      currency:
                        task.assignedEmployee.organization.currency ??
                        undefined,
                      timezone:
                        task.assignedEmployee.organization.timezone ??
                        undefined,
                      fiscal_start_month:
                        task.assignedEmployee.organization.fiscal_start_month ??
                        undefined,
                      created_at: toISOStringSafe(
                        task.assignedEmployee.organization.created_at,
                      ),
                      updated_at: toISOStringSafe(
                        task.assignedEmployee.organization.updated_at,
                      ),
                      deleted_at: task.assignedEmployee.organization.deleted_at
                        ? toISOStringSafe(
                            task.assignedEmployee.organization.deleted_at,
                          )
                        : null,
                      owner: task.assignedEmployee.organization.owner ?? null,
                    } satisfies IHrmPlatformOrganization.ISummary)
                  : null,
                member: {
                  id: task.assignedEmployee.member.id,
                  email: task.assignedEmployee.member.email,
                  display_name:
                    task.assignedEmployee.member.display_name ?? undefined,
                  avatar_uri:
                    task.assignedEmployee.member.avatar_uri ?? undefined,
                  phone_number:
                    task.assignedEmployee.member.phone_number ?? undefined,
                  is_active: task.assignedEmployee.member.is_active,
                  last_login_at: task.assignedEmployee.member.last_login_at
                    ? toISOStringSafe(
                        task.assignedEmployee.member.last_login_at,
                      )
                    : undefined,
                  created_at: toISOStringSafe(
                    task.assignedEmployee.member.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    task.assignedEmployee.member.updated_at,
                  ),
                  deleted_at: task.assignedEmployee.member.deleted_at
                    ? toISOStringSafe(task.assignedEmployee.member.deleted_at)
                    : undefined,
                } satisfies IHrmPlatformMember.ISummary,
                role: {
                  id: task.assignedEmployee.role.id,
                  name: task.assignedEmployee.role.name,
                  role_kind: task.assignedEmployee.role.role_kind,
                  organization: task.assignedEmployee.role.organization
                    ? ({
                        id: task.assignedEmployee.role.organization.id,
                        name: task.assignedEmployee.role.organization.name,
                        description:
                          task.assignedEmployee.role.organization.description ??
                          undefined,
                        currency:
                          task.assignedEmployee.role.organization.currency ??
                          undefined,
                        timezone:
                          task.assignedEmployee.role.organization.timezone ??
                          undefined,
                        fiscal_start_month:
                          task.assignedEmployee.role.organization
                            .fiscal_start_month ?? undefined,
                        created_at: toISOStringSafe(
                          task.assignedEmployee.role.organization.created_at,
                        ),
                        updated_at: toISOStringSafe(
                          task.assignedEmployee.role.organization.updated_at,
                        ),
                        deleted_at: task.assignedEmployee.role.organization
                          .deleted_at
                          ? toISOStringSafe(
                              task.assignedEmployee.role.organization
                                .deleted_at,
                            )
                          : null,
                        owner:
                          task.assignedEmployee.role.organization.owner ?? null,
                      } satisfies IHrmPlatformOrganization.ISummary)
                    : null,
                  permissions_count: 0,
                } satisfies IHrmPlatformRole.ISummary,
              } satisfies IHrmPlatformEmployee.ISummary)
            : null,
        } satisfies IHrmPlatformTask.ISummary;
      },
    );
    return {
      dashboard_type: "personal",
      personal_metrics: {
        hours_logged_today,
        active_timer: activeTimer,
        recent_timelogs,
        pending_timesheet_status,
        assigned_tasks,
      } satisfies IHrmPlatformDashboardIPersonalMetric,
      org_metrics: null,
    } satisfies IHrmPlatformDashboard.IResponse;
  }
  if (props.body.dashboard_type === "organization") {
    const hasReportViewPermission =
      await MyGlobal.prisma.hrm_platform_permissions.findFirst({
        where: {
          organization_id: employeeRecord.hrm_platform_organization_id,
          code: "report_view",
          deleted_at: null,
        },
      });
    if (!hasReportViewPermission) {
      throw new HttpException("Forbidden", 403);
    }
    const totalActiveEmployeesResult =
      await MyGlobal.prisma.hrm_platform_employees.aggregate({
        where: {
          hrm_platform_organization_id:
            employeeRecord.hrm_platform_organization_id,
          deleted_at: null,
          status: "active",
        },
        _count: { id: true },
      });
    const total_active_employees: number & tags.Type<"int32"> =
      totalActiveEmployeesResult._count.id;
    const activeEmployees =
      await MyGlobal.prisma.hrm_platform_employees.findMany({
        where: {
          hrm_platform_organization_id:
            employeeRecord.hrm_platform_organization_id,
          deleted_at: null,
          status: "active",
        },
        select: { id: true },
      });
    const activeEmployeeIds: string[] = activeEmployees.map((e) => e.id);
    const pendingTimesheetsResult =
      await MyGlobal.prisma.hrm_platform_timesheets.aggregate({
        where: {
          hrm_platform_employee_id: { in: activeEmployeeIds },
          status: "submitted",
          deleted_at: null,
        },
        _count: { id: true },
      });
    const pending_timesheets_count: number & tags.Type<"int32"> =
      pendingTimesheetsResult._count.id;
    return {
      dashboard_type: "organization",
      personal_metrics: null,
      org_metrics: {
        total_active_employees,
        pending_timesheets_count,
      } satisfies IHrmPlatformDashboardIOrgMetric,
    } satisfies IHrmPlatformDashboard.IResponse;
  }
  throw new HttpException("Invalid dashboard type", 400);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
// import { IHrmPlatformDashboardIPersonalMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboardIPersonalMetric";
// import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
// import { IHrmPlatformDashboardIOrgMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboardIOrgMetric";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberDashboard(props: {
//   member: MemberPayload;
//   body: IHrmPlatformDashboard.IRequest;
// }): Promise<IHrmPlatformDashboard.IResponse> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------