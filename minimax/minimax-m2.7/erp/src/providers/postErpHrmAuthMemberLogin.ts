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

export async function postErpHrmAuthMemberLogin(props: {
  ip: string;
  body: IErpHrmMember.ILogin;
}): Promise<IErpHrmMember.IAuthorized> {
  // 1. Find member by email with password_hash explicitly selected
  const member = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      display_name: true,
      avatar_uri: true,
      phone: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Generate token expiration times
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // 4. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Create new session record
  const session = await MyGlobal.prisma.erp_hrm_member_sessions.create({
    data: {
      id: v4(),
      erp_hrm_member_id: member.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expired_at: accessExpires,
      created_at: new Date(),
      expired_at: refreshExpires,
    },
  });
  // 6. Get first employee for organization context
  const firstEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  // 7. Build authorization token response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // 8. Fetch additional stats for IAuthorized response
  const activeTimers = await getActiveTimers(
    firstEmployee?.erp_hrm_organization_id,
  );
  const projectSummary = await getProjectSummary(
    firstEmployee?.erp_hrm_organization_id,
  );
  const taskOverview = await getTaskOverview(
    firstEmployee?.erp_hrm_organization_id,
  );
  const recentActivity = await getRecentActivity(
    firstEmployee?.erp_hrm_organization_id,
  );
  // 9. Return authorized member response
  return {
    id: member.id as string & tags.Format<"uuid">,
    email: member.email as string & tags.Format<"email">,
    display_name: member.display_name,
    avatar_uri: member.avatar_uri,
    phone: member.phone,
    created_at: member.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: member.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at:
      (member.deleted_at?.toISOString() as
        | (string & tags.Format<"date-time">)
        | null) ?? null,
    token: token,
    activeTimers: activeTimers,
    projectSummary: projectSummary,
    taskOverview: taskOverview,
    recentActivity: recentActivity,
  } satisfies IErpHrmMember.IAuthorized;
}
async function getActiveTimers(
  organizationId: string | null | undefined,
): Promise<IErpHrmTimer.ISummary[]> {
  if (!organizationId) {
    return [];
  }
  const timers = await MyGlobal.prisma.erp_hrm_timers.findMany({
    where: {
      employee: {
        erp_hrm_organization_id: organizationId,
      },
    },
    select: {
      id: true,
      started_at: true,
      description: true,
      project: {
        select: {
          id: true,
          name: true,
          color: true,
          status: true,
          budget_hours: true,
          start_date: true,
          end_date: true,
          created_at: true,
          organization: {
            select: {
              id: true,
              name: true,
              description: true,
              logo_uri: true,
              currency: true,
              timezone: true,
              fiscal_start_month: true,
              created_at: true,
              owner_id: true,
            },
          },
        },
      },
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          due_date: true,
          created_at: true,
          updated_at: true,
          erp_hrm_project_id: true,
          erp_hrm_employee_id: true,
          parent_id: true,
          subtasks_count: true,
          task_histories_count: true,
          timelogs_count: true,
          timers_count: true,
          project: {
            select: {
              id: true,
              name: true,
              color: true,
              status: true,
              budget_hours: true,
              start_date: true,
              end_date: true,
              created_at: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  logo_uri: true,
                  currency: true,
                  timezone: true,
                  fiscal_start_month: true,
                  created_at: true,
                  owner_id: true,
                },
              },
            },
          },
          assignee: {
            select: {
              id: true,
              position: true,
              employment_type: true,
              status: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              member: {
                select: {
                  id: true,
                  email: true,
                  display_name: true,
                  avatar_uri: true,
                  phone: true,
                  created_at: true,
                },
              },
              role: {
                select: {
                  id: true,
                  name: true,
                  is_builtin: true,
                  created_at: true,
                  erp_hrm_organization_id: true,
                },
              },
              department: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  parent_id: true,
                },
              },
            },
          },
        },
      },
    },
  });
  return timers.map(
    (timer) =>
      ({
        id: timer.id as string & tags.Format<"uuid">,
        startedAt: timer.started_at.toISOString() as string &
          tags.Format<"date-time">,
        description: timer.description,
        project: {
          id: timer.project.id as string & tags.Format<"uuid">,
          name: timer.project.name,
          color: timer.project.color,
          status: timer.project.status,
          budget_hours: timer.project.budget_hours,
          start_date:
            (timer.project.start_date?.toISOString() as
              | (string & tags.Format<"date-time">)
              | null) ?? undefined,
          end_date:
            (timer.project.end_date?.toISOString() as
              | (string & tags.Format<"date-time">)
              | null) ?? undefined,
          created_at: timer.project.created_at.toISOString() as string &
            tags.Format<"date-time">,
          organization: {
            id: timer.project.organization.id as string & tags.Format<"uuid">,
            name: timer.project.organization.name,
            description: timer.project.organization.description,
            logoUri: timer.project.organization.logo_uri,
            currency: timer.project.organization.currency,
            timezone: timer.project.organization.timezone,
            fiscalStartMonth: timer.project.organization
              .fiscal_start_month as number & tags.Type<"int32">,
            createdAt:
              timer.project.organization.created_at.toISOString() as string &
                tags.Format<"date-time">,
            owner: {
              id: timer.project.organization.owner_id as string &
                tags.Format<"uuid">,
              email: "" as string & tags.Format<"email">,
              displayName: "",
              avatarUri: null,
              phone: null,
              createdAt: "" as string & tags.Format<"date-time">,
            } satisfies IErpHrmMember.ISummary,
          } satisfies IErpHrmOrganization.ISummary,
        } satisfies IErpHrmProjectMember.ISummary,
        task: timer.task
          ? ({
              id: timer.task.id as string & tags.Format<"uuid">,
              title: timer.task.title,
              status: timer.task.status,
              priority: timer.task.priority,
              due_date:
                (timer.task.due_date?.toISOString() as
                  | (string & tags.Format<"date-time">)
                  | null) ?? undefined,
              subtasks_count: timer.task.subtasks_count as number &
                tags.Type<"int32">,
              task_histories_count: timer.task.task_histories_count as number &
                tags.Type<"int32">,
              timelogs_count: timer.task.timelogs_count as number &
                tags.Type<"int32">,
              timers_count: timer.task.timers_count as number &
                tags.Type<"int32">,
              project: {
                id: timer.task.project.id as string & tags.Format<"uuid">,
                name: timer.task.project.name,
                color: timer.task.project.color,
                status: timer.task.project.status,
                budget_hours: timer.task.project.budget_hours,
                start_date:
                  (timer.task.project.start_date?.toISOString() as
                    | (string & tags.Format<"date-time">)
                    | null) ?? undefined,
                end_date:
                  (timer.task.project.end_date?.toISOString() as
                    | (string & tags.Format<"date-time">)
                    | null) ?? undefined,
                created_at:
                  timer.task.project.created_at.toISOString() as string &
                    tags.Format<"date-time">,
                organization: {
                  id: timer.task.project.organization.id as string &
                    tags.Format<"uuid">,
                  name: timer.task.project.organization.name,
                  description: timer.task.project.organization.description,
                  logoUri: timer.task.project.organization.logo_uri,
                  currency: timer.task.project.organization.currency,
                  timezone: timer.task.project.organization.timezone,
                  fiscalStartMonth: timer.task.project.organization
                    .fiscal_start_month as number & tags.Type<"int32">,
                  createdAt:
                    timer.task.project.organization.created_at.toISOString() as string &
                      tags.Format<"date-time">,
                  owner: {
                    id: timer.task.project.organization.owner_id as string &
                      tags.Format<"uuid">,
                    email: "" as string & tags.Format<"email">,
                    displayName: "",
                    avatarUri: null,
                    phone: null,
                    createdAt: "" as string & tags.Format<"date-time">,
                  } satisfies IErpHrmMember.ISummary,
                } satisfies IErpHrmOrganization.ISummary,
              } satisfies IErpHrmProjectMember.ISummary,
              assignee: timer.task.assignee
                ? ({
                    id: timer.task.assignee.id as string & tags.Format<"uuid">,
                    position: timer.task.assignee.position,
                    employment_type: timer.task.assignee.employment_type,
                    status: timer.task.assignee.status,
                    created_at:
                      timer.task.assignee.created_at.toISOString() as string &
                        tags.Format<"date-time">,
                    updated_at:
                      timer.task.assignee.updated_at.toISOString() as string &
                        tags.Format<"date-time">,
                    deleted_at:
                      (timer.task.assignee.deleted_at?.toISOString() as
                        | (string & tags.Format<"date-time">)
                        | null) ?? undefined,
                    member: {
                      id: timer.task.assignee.member.id as string &
                        tags.Format<"uuid">,
                      email: timer.task.assignee.member.email as string &
                        tags.Format<"email">,
                      displayName: timer.task.assignee.member.display_name,
                      avatarUri: timer.task.assignee.member.avatar_uri,
                      phone: timer.task.assignee.member.phone,
                      createdAt:
                        timer.task.assignee.member.created_at.toISOString() as string &
                          tags.Format<"date-time">,
                    } satisfies IErpHrmMember.ISummary,
                    role: {
                      id: timer.task.assignee.role.id as string &
                        tags.Format<"uuid">,
                      name: timer.task.assignee.role.name,
                      is_builtin: timer.task.assignee.role.is_builtin,
                      created_at:
                        timer.task.assignee.role.created_at.toISOString() as string &
                          tags.Format<"date-time">,
                      organization: {
                        id: timer.task.assignee.role
                          .erp_hrm_organization_id as string &
                          tags.Format<"uuid">,
                        name: "",
                        description: null,
                        logoUri: null,
                        currency: "",
                        timezone: "",
                        fiscalStartMonth: 1 as number & tags.Type<"int32">,
                        createdAt: "" as string & tags.Format<"date-time">,
                        owner: {
                          id: "" as string & tags.Format<"uuid">,
                          email: "" as string & tags.Format<"email">,
                          displayName: "",
                          avatarUri: null,
                          phone: null,
                          createdAt: "" as string & tags.Format<"date-time">,
                        } satisfies IErpHrmMember.ISummary,
                      } satisfies IErpHrmOrganization.ISummary,
                    } satisfies IErpHrmRole.ISummary,
                    department: timer.task.assignee.department
                      ? ({
                          id: timer.task.assignee.department.id as string &
                            tags.Format<"uuid">,
                          name: timer.task.assignee.department.name,
                          description:
                            timer.task.assignee.department.description,
                          created_at:
                            timer.task.assignee.department.created_at.toISOString() as string &
                              tags.Format<"date-time">,
                          updated_at:
                            timer.task.assignee.department.updated_at.toISOString() as string &
                              tags.Format<"date-time">,
                          parent: null,
                        } satisfies IErpHrmDepartment.ISummary)
                      : undefined,
                  } satisfies IErpHrmEmployee.ISummary)
                : undefined,
            } satisfies IErpHrmTask.ISummary)
          : undefined,
      }) satisfies IErpHrmTimer.ISummary,
  );
}
async function getProjectSummary(
  organizationId: string | null | undefined,
): Promise<{
  active: number & tags.Type<"int32">;
  archived: number & tags.Type<"int32">;
  completed: number & tags.Type<"int32">;
}> {
  if (!organizationId) {
    return {
      active: 0 as number & tags.Type<"int32">,
      archived: 0 as number & tags.Type<"int32">,
      completed: 0 as number & tags.Type<"int32">,
    };
  }
  const projects = await MyGlobal.prisma.erp_hrm_projects.groupBy({
    by: ["status"],
    where: {
      erp_hrm_organization_id: organizationId,
    },
    _count: {
      status: true,
    },
  });
  const summary = {
    active: 0 as number & tags.Type<"int32">,
    archived: 0 as number & tags.Type<"int32">,
    completed: 0 as number & tags.Type<"int32">,
  };
  for (const project of projects) {
    if (project.status === "active") {
      summary.active = project._count.status as number & tags.Type<"int32">;
    } else if (project.status === "archived") {
      summary.archived = project._count.status as number & tags.Type<"int32">;
    } else if (project.status === "completed") {
      summary.completed = project._count.status as number & tags.Type<"int32">;
    }
  }
  return summary;
}
async function getTaskOverview(
  organizationId: string | null | undefined,
): Promise<{
  byStatus: {
    open: number & tags.Type<"int32">;
    inProgress: number & tags.Type<"int32">;
    completed: number & tags.Type<"int32">;
    closed: number & tags.Type<"int32">;
  };
  byPriority: {
    low: number & tags.Type<"int32">;
    medium: number & tags.Type<"int32">;
    high: number & tags.Type<"int32">;
    urgent: number & tags.Type<"int32">;
  };
}> {
  if (!organizationId) {
    return {
      byStatus: {
        open: 0 as number & tags.Type<"int32">,
        inProgress: 0 as number & tags.Type<"int32">,
        completed: 0 as number & tags.Type<"int32">,
        closed: 0 as number & tags.Type<"int32">,
      },
      byPriority: {
        low: 0 as number & tags.Type<"int32">,
        medium: 0 as number & tags.Type<"int32">,
        high: 0 as number & tags.Type<"int32">,
        urgent: 0 as number & tags.Type<"int32">,
      },
    };
  }
  const tasks = await MyGlobal.prisma.erp_hrm_tasks.findMany({
    where: {
      project: {
        erp_hrm_organization_id: organizationId,
      },
    },
    select: {
      status: true,
      priority: true,
    },
  });
  const overview = {
    byStatus: {
      open: 0 as number & tags.Type<"int32">,
      inProgress: 0 as number & tags.Type<"int32">,
      completed: 0 as number & tags.Type<"int32">,
      closed: 0 as number & tags.Type<"int32">,
    },
    byPriority: {
      low: 0 as number & tags.Type<"int32">,
      medium: 0 as number & tags.Type<"int32">,
      high: 0 as number & tags.Type<"int32">,
      urgent: 0 as number & tags.Type<"int32">,
    },
  };
  for (const task of tasks) {
    if (task.status === "open") {
      overview.byStatus.open = (overview.byStatus.open + 1) as number &
        tags.Type<"int32">;
    } else if (task.status === "in-progress") {
      overview.byStatus.inProgress = (overview.byStatus.inProgress +
        1) as number & tags.Type<"int32">;
    } else if (task.status === "completed") {
      overview.byStatus.completed = (overview.byStatus.completed +
        1) as number & tags.Type<"int32">;
    } else if (task.status === "closed") {
      overview.byStatus.closed = (overview.byStatus.closed + 1) as number &
        tags.Type<"int32">;
    }
    if (task.priority === "low") {
      overview.byPriority.low = (overview.byPriority.low + 1) as number &
        tags.Type<"int32">;
    } else if (task.priority === "medium") {
      overview.byPriority.medium = (overview.byPriority.medium + 1) as number &
        tags.Type<"int32">;
    } else if (task.priority === "high") {
      overview.byPriority.high = (overview.byPriority.high + 1) as number &
        tags.Type<"int32">;
    } else if (task.priority === "urgent") {
      overview.byPriority.urgent = (overview.byPriority.urgent + 1) as number &
        tags.Type<"int32">;
    }
  }
  return overview;
}
async function getRecentActivity(
  organizationId: string | null | undefined,
): Promise<{
  timelogsCount: number & tags.Type<"int32">;
  totalHoursThisWeek: number;
}> {
  if (!organizationId) {
    return {
      timelogsCount: 0 as number & tags.Type<"int32">,
      totalHoursThisWeek: 0,
    };
  }
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const timelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: {
      employee: {
        erp_hrm_organization_id: organizationId,
      },
      created_at: {
        gte: sevenDaysAgo,
      },
    },
    select: {
      duration_minutes: true,
    },
  });
  const timelogsCount = timelogs.length as number & tags.Type<"int32">;
  const totalMinutes = timelogs.reduce(
    (sum, log) => sum + log.duration_minutes,
    0,
  );
  const totalHoursThisWeek = totalMinutes / 60.0;
  return {
    timelogsCount: timelogsCount,
    totalHoursThisWeek: totalHoursThisWeek,
  };
}
