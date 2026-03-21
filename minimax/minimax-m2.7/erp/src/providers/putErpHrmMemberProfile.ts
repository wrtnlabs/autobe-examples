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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberProfile(props: {
  member: MemberPayload;
  body: IErpHrmMember.IUpdate;
}): Promise<IErpHrmMember> {
  await MyGlobal.prisma.erp_hrm_members.update({
    where: { id: props.member.id },
    data: {
      display_name: props.body.display_name,
      avatar_uri:
        props.body.avatar_uri === "" ? null : (props.body.avatar_uri ?? null),
      phone: props.body.phone === null ? null : props.body.phone,
      updated_at: new Date(),
    },
  });
  const memberEmployees = await MyGlobal.prisma.erp_hrm_employees.findMany({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      erp_hrm_organization_id: true,
    },
  });
  if (memberEmployees.length === 0) {
    return {
      activeTimers: [],
      projectSummary: {
        active: 0,
        archived: 0,
        completed: 0,
      },
      taskOverview: {
        byStatus: {
          open: 0,
          inProgress: 0,
          completed: 0,
          closed: 0,
        },
        byPriority: {
          low: 0,
          medium: 0,
          high: 0,
          urgent: 0,
        },
      },
      recentActivity: {
        timelogsCount: 0,
        totalHoursThisWeek: 0,
      },
    };
  }
  const organizationIds = memberEmployees.map((e) => e.erp_hrm_organization_id);
  const activeTimers = await MyGlobal.prisma.erp_hrm_timers.findMany({
    where: {
      employee: {
        erp_hrm_organization_id: { in: organizationIds },
        deleted_at: null,
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
              owner: {
                select: {
                  id: true,
                  email: true,
                  display_name: true,
                  avatar_uri: true,
                  phone: true,
                  created_at: true,
                },
              },
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
                  owner: {
                    select: {
                      id: true,
                      email: true,
                      display_name: true,
                      avatar_uri: true,
                      phone: true,
                      created_at: true,
                    },
                  },
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
                      owner: {
                        select: {
                          id: true,
                          email: true,
                          display_name: true,
                          avatar_uri: true,
                          phone: true,
                          created_at: true,
                        },
                      },
                    },
                  },
                },
              },
              department: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  parent: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      created_at: true,
                      updated_at: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  const projectsByStatus = await MyGlobal.prisma.erp_hrm_projects.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  const projectSummary: IErpHrmMember["projectSummary"] = {
    active: 0,
    archived: 0,
    completed: 0,
  };
  for (const group of projectsByStatus) {
    if (group.status === "active") {
      projectSummary.active = group._count.status;
    } else if (group.status === "archived") {
      projectSummary.archived = group._count.status;
    } else if (group.status === "completed") {
      projectSummary.completed = group._count.status;
    }
  }
  const tasksByStatus = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  const taskOverviewByStatus: IErpHrmMember["taskOverview"]["byStatus"] = {
    open: 0,
    inProgress: 0,
    completed: 0,
    closed: 0,
  };
  for (const group of tasksByStatus) {
    if (group.status === "open") {
      taskOverviewByStatus.open = group._count.status;
    } else if (group.status === "in-progress") {
      taskOverviewByStatus.inProgress = group._count.status;
    } else if (group.status === "completed") {
      taskOverviewByStatus.completed = group._count.status;
    } else if (group.status === "closed") {
      taskOverviewByStatus.closed = group._count.status;
    }
  }
  const tasksByPriority = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["priority"],
    _count: { priority: true },
  });
  const taskOverviewByPriority: IErpHrmMember["taskOverview"]["byPriority"] = {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  };
  for (const group of tasksByPriority) {
    if (group.priority === "low") {
      taskOverviewByPriority.low = group._count.priority;
    } else if (group.priority === "medium") {
      taskOverviewByPriority.medium = group._count.priority;
    } else if (group.priority === "high") {
      taskOverviewByPriority.high = group._count.priority;
    } else if (group.priority === "urgent") {
      taskOverviewByPriority.urgent = group._count.priority;
    }
  }
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentTimelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: {
      created_at: {
        gte: sevenDaysAgo,
      },
    },
    select: {
      duration_minutes: true,
    },
  });
  const recentActivity: IErpHrmMember["recentActivity"] = {
    timelogsCount: recentTimelogs.length,
    totalHoursThisWeek:
      recentTimelogs.reduce((sum, t) => sum + (t.duration_minutes || 0), 0) /
      60.0,
  };
  const transformedActiveTimers: IErpHrmTimer.ISummary[] = activeTimers.map(
    (timer) =>
      ({
        id: timer.id as string & tags.Format<"uuid">,
        startedAt: toISOStringSafe(timer.started_at),
        description: timer.description,
        project: {
          id: timer.project.id as string & tags.Format<"uuid">,
          name: timer.project.name,
          color: timer.project.color,
          status: timer.project.status,
          budget_hours: timer.project.budget_hours,
          start_date: timer.project.start_date
            ? toISOStringSafe(timer.project.start_date)
            : null,
          end_date: timer.project.end_date
            ? toISOStringSafe(timer.project.end_date)
            : null,
          created_at: toISOStringSafe(timer.project.created_at),
          organization: {
            id: timer.project.organization.id as string & tags.Format<"uuid">,
            name: timer.project.organization.name,
            description: timer.project.organization.description,
            logoUri: timer.project.organization.logo_uri,
            currency: timer.project.organization.currency,
            timezone: timer.project.organization.timezone,
            fiscalStartMonth: timer.project.organization
              .fiscal_start_month as number & tags.Type<"int32">,
            createdAt: toISOStringSafe(timer.project.organization.created_at),
            owner: {
              id: timer.project.organization.owner.id as string &
                tags.Format<"uuid">,
              email: timer.project.organization.owner.email as string &
                tags.Format<"email">,
              displayName: timer.project.organization.owner.display_name,
              avatarUri: timer.project.organization.owner.avatar_uri,
              phone: timer.project.organization.owner.phone,
              createdAt: toISOStringSafe(
                timer.project.organization.owner.created_at,
              ),
            } satisfies IErpHrmMember.ISummary,
          } satisfies IErpHrmOrganization.ISummary,
        } satisfies IErpHrmProjectMember.ISummary,
        task: timer.task
          ? ({
              id: timer.task.id as string & tags.Format<"uuid">,
              title: timer.task.title,
              status: timer.task.status,
              priority: timer.task.priority,
              project: {
                id: timer.task.project.id as string & tags.Format<"uuid">,
                name: timer.task.project.name,
                color: timer.task.project.color,
                status: timer.task.project.status,
                budget_hours: timer.task.project.budget_hours,
                start_date: timer.task.project.start_date
                  ? toISOStringSafe(timer.task.project.start_date)
                  : null,
                end_date: timer.task.project.end_date
                  ? toISOStringSafe(timer.task.project.end_date)
                  : null,
                created_at: toISOStringSafe(timer.task.project.created_at),
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
                  createdAt: toISOStringSafe(
                    timer.task.project.organization.created_at,
                  ),
                  owner: {
                    id: timer.task.project.organization.owner.id as string &
                      tags.Format<"uuid">,
                    email: timer.task.project.organization.owner
                      .email as string & tags.Format<"email">,
                    displayName:
                      timer.task.project.organization.owner.display_name,
                    avatarUri: timer.task.project.organization.owner.avatar_uri,
                    phone: timer.task.project.organization.owner.phone,
                    createdAt: toISOStringSafe(
                      timer.task.project.organization.owner.created_at,
                    ),
                  } satisfies IErpHrmMember.ISummary,
                } satisfies IErpHrmOrganization.ISummary,
              } satisfies IErpHrmProjectMember.ISummary,
              assignee: timer.task.assignee
                ? ({
                    id: timer.task.assignee.id as string & tags.Format<"uuid">,
                    position: timer.task.assignee.position,
                    employment_type: timer.task.assignee.employment_type,
                    status: timer.task.assignee.status,
                    created_at: toISOStringSafe(timer.task.assignee.created_at),
                    updated_at: toISOStringSafe(timer.task.assignee.updated_at),
                    deleted_at: timer.task.assignee.deleted_at
                      ? toISOStringSafe(timer.task.assignee.deleted_at)
                      : null,
                    member: {
                      id: timer.task.assignee.member.id as string &
                        tags.Format<"uuid">,
                      email: timer.task.assignee.member.email as string &
                        tags.Format<"email">,
                      displayName: timer.task.assignee.member.display_name,
                      avatarUri: timer.task.assignee.member.avatar_uri,
                      phone: timer.task.assignee.member.phone,
                      createdAt: toISOStringSafe(
                        timer.task.assignee.member.created_at,
                      ),
                    } satisfies IErpHrmMember.ISummary,
                    role: {
                      id: timer.task.assignee.role.id as string &
                        tags.Format<"uuid">,
                      name: timer.task.assignee.role.name,
                      is_builtin: timer.task.assignee.role.is_builtin,
                      created_at: toISOStringSafe(
                        timer.task.assignee.role.created_at,
                      ),
                      organization: {
                        id: timer.task.assignee.role.organization.id as string &
                          tags.Format<"uuid">,
                        name: timer.task.assignee.role.organization.name,
                        description:
                          timer.task.assignee.role.organization.description,
                        logoUri: timer.task.assignee.role.organization.logo_uri,
                        currency:
                          timer.task.assignee.role.organization.currency,
                        timezone:
                          timer.task.assignee.role.organization.timezone,
                        fiscalStartMonth: timer.task.assignee.role.organization
                          .fiscal_start_month as number & tags.Type<"int32">,
                        createdAt: toISOStringSafe(
                          timer.task.assignee.role.organization.created_at,
                        ),
                        owner: {
                          id: timer.task.assignee.role.organization.owner
                            .id as string & tags.Format<"uuid">,
                          email: timer.task.assignee.role.organization.owner
                            .email as string & tags.Format<"email">,
                          displayName:
                            timer.task.assignee.role.organization.owner
                              .display_name,
                          avatarUri:
                            timer.task.assignee.role.organization.owner
                              .avatar_uri,
                          phone:
                            timer.task.assignee.role.organization.owner.phone,
                          createdAt: toISOStringSafe(
                            timer.task.assignee.role.organization.owner
                              .created_at,
                          ),
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
                          created_at: toISOStringSafe(
                            timer.task.assignee.department.created_at,
                          ),
                          updated_at: toISOStringSafe(
                            timer.task.assignee.department.updated_at,
                          ),
                          parent: timer.task.assignee.department.parent
                            ? ({
                                id: timer.task.assignee.department.parent
                                  .id as string & tags.Format<"uuid">,
                                name: timer.task.assignee.department.parent
                                  .name,
                                description:
                                  timer.task.assignee.department.parent
                                    .description,
                                created_at: toISOStringSafe(
                                  timer.task.assignee.department.parent
                                    .created_at,
                                ),
                                updated_at: toISOStringSafe(
                                  timer.task.assignee.department.parent
                                    .updated_at,
                                ),
                              } satisfies IErpHrmDepartment.ISummary)
                            : null,
                        } satisfies IErpHrmDepartment.ISummary)
                      : null,
                  } satisfies IErpHrmEmployee.ISummary)
                : null,
              due_date: timer.task.due_date
                ? toISOStringSafe(timer.task.due_date)
                : null,
              subtasks_count: 0 as number & tags.Type<"int32">,
              task_histories_count: 0 as number & tags.Type<"int32">,
              timelogs_count: 0 as number & tags.Type<"int32">,
              timers_count: 0 as number & tags.Type<"int32">,
            } satisfies IErpHrmTask.ISummary)
          : null,
      }) satisfies IErpHrmTimer.ISummary,
  );
  return {
    activeTimers: transformedActiveTimers,
    projectSummary,
    taskOverview: {
      byStatus: taskOverviewByStatus,
      byPriority: taskOverviewByPriority,
    },
    recentActivity,
  };
}
