import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimeReport";
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

export async function patchHrmPlatformMemberReportsTime(props: {
  member: MemberPayload;
  body: IHrmPlatformTimeReport.IRequest;
}): Promise<IPageIHrmPlatformTimeReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
      },
    });
  const dateFrom = new Date(props.body.dateFrom);
  const dateTo = new Date(props.body.dateTo);
  dateTo.setHours(23, 59, 59, 999);
  if (dateTo < dateFrom) {
    throw new HttpException(
      "Invalid date range: end date must be after start date",
      400,
    );
  }
  const whereInput = {
    employee: {
      organization_id: employee.organization_id,
      deleted_at: null,
    },
    date: {
      gte: dateFrom,
      lte: dateTo,
    },
    deleted_at: null,
    ...(props.body.employeeIds &&
      props.body.employeeIds.length > 0 && {
        employee_id: { in: props.body.employeeIds },
      }),
    ...(props.body.projectIds &&
      props.body.projectIds.length > 0 && {
        project_id: { in: props.body.projectIds },
      }),
    ...(props.body.taskIds &&
      props.body.taskIds.length > 0 && {
        task_id: { in: props.body.taskIds },
      }),
    ...(props.body.billable !== undefined && {
      billable: props.body.billable,
    }),
  } satisfies Prisma.hrm_platform_timelogsWhereInput;
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: whereInput,
    select: {
      employee_id: true,
      project_id: true,
      task_id: true,
      duration_minutes: true,
      billable: true,
      employee: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              display_name: true,
              avatar_image: true,
              phone_number: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              is_builtin: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  logo: true,
                  currency: true,
                  timezone: true,
                  created_at: true,
                },
              },
              created_at: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              description: true,
              parentDepartment: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  parentDepartment: true,
                  created_at: true,
                  deleted_at: true,
                },
              },
              created_at: true,
              deleted_at: true,
            },
          },
          position: true,
          employment_type: true,
          status: true,
          created_at: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          color_code: true,
          status: true,
          budget_hours: true,
          start_date: true,
          end_date: true,
          created_at: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          due_date: true,
          estimated_hours: true,
          assignee: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  display_name: true,
                  avatar_image: true,
                  phone_number: true,
                },
              },
              role: {
                select: {
                  id: true,
                  name: true,
                  is_builtin: true,
                  organization: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      logo: true,
                      currency: true,
                      timezone: true,
                      created_at: true,
                    },
                  },
                  created_at: true,
                },
              },
              department: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  parentDepartment: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      parentDepartment: true,
                      created_at: true,
                      deleted_at: true,
                    },
                  },
                  created_at: true,
                  deleted_at: true,
                },
              },
              position: true,
              employment_type: true,
              status: true,
              created_at: true,
            },
          },
          parentTask: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              due_date: true,
              estimated_hours: true,
              project: {
                select: {
                  id: true,
                  name: true,
                  color_code: true,
                  status: true,
                  created_at: true,
                },
              },
              created_at: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              color_code: true,
              status: true,
              created_at: true,
            },
          },
          created_at: true,
        },
      },
    },
  });
  const groupMap = new Map<
    string,
    {
      group_type: "employee" | "project" | "task";
      employee: IHrmPlatformEmployee.ISummary | null;
      project: IHrmPlatformProject.ISummary | null;
      task: IHrmPlatformTask.ISummary | null;
      total_minutes: number;
      billable_minutes: number;
      non_billable_minutes: number;
    }
  >();
  for (const timelog of timelogs) {
    let groupKey: string;
    let groupData: {
      group_type: "employee" | "project" | "task";
      employee: IHrmPlatformEmployee.ISummary | null;
      project: IHrmPlatformProject.ISummary | null;
      task: IHrmPlatformTask.ISummary | null;
    };
    if (props.body.group === "employee") {
      groupKey = timelog.employee_id;
      groupData = {
        group_type: "employee",
        employee: {
          id: timelog.employee.id,
          user: {
            id: timelog.employee.user.id,
            display_name: timelog.employee.user.display_name,
            avatar_image: timelog.employee.user.avatar_image,
            phone_number: timelog.employee.user.phone_number,
          } satisfies IHrmPlatformMember.ISummary,
          role: {
            id: timelog.employee.role.id,
            name: timelog.employee.role.name,
            is_builtin: timelog.employee.role.is_builtin,
            description: null,
            organization: {
              id: timelog.employee.role.organization.id,
              name: timelog.employee.role.organization.name,
              description:
                timelog.employee.role.organization.description ?? null,
              logo: timelog.employee.role.organization.logo ?? null,
              currency: timelog.employee.role.organization.currency,
              timezone: timelog.employee.role.organization.timezone,
            } satisfies IHrmPlatformOrganization.ISummary,
            created_at:
              timelog.employee.role.created_at.toISOString() as string &
                tags.Format<"date-time">,
          } satisfies IHrmPlatformRole.ISummary,
          department: timelog.employee.department
            ? ({
                id: timelog.employee.department.id,
                name: timelog.employee.department.name,
                description: timelog.employee.department.description ?? null,
                parent: timelog.employee.department.parentDepartment
                  ? ({
                      id: timelog.employee.department.parentDepartment.id,
                      name: timelog.employee.department.parentDepartment.name,
                      description:
                        timelog.employee.department.parentDepartment
                          .description ?? null,
                      parent: null,
                      created_at:
                        timelog.employee.department.parentDepartment.created_at.toISOString() as string &
                          tags.Format<"date-time">,
                      deleted_at:
                        timelog.employee.department.parentDepartment.deleted_at?.toISOString() as
                          | (string & tags.Format<"date-time">)
                          | null,
                    } satisfies IHrmPlatformDepartment.ISummary)
                  : null,
                created_at:
                  timelog.employee.department.created_at.toISOString() as string &
                    tags.Format<"date-time">,
                deleted_at:
                  timelog.employee.department.deleted_at?.toISOString() as
                    | (string & tags.Format<"date-time">)
                    | null,
              } satisfies IHrmPlatformDepartment.ISummary)
            : null,
          position: timelog.employee.position ?? null,
          employment_type: timelog.employee.employment_type,
          status: timelog.employee.status,
          created_at: timelog.employee.created_at.toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IHrmPlatformEmployee.ISummary,
        project: null,
        task: null,
      };
    } else if (props.body.group === "project") {
      groupKey = timelog.project_id;
      groupData = {
        group_type: "project",
        employee: null,
        project: {
          id: timelog.project.id,
          name: timelog.project.name,
          color_code: timelog.project.color_code,
          status: timelog.project.status,
          budget_hours: timelog.project.budget_hours ?? null,
          start_date: timelog.project.start_date?.toISOString() as
            | (string & tags.Format<"date-time">)
            | null,
          end_date: timelog.project.end_date?.toISOString() as
            | (string & tags.Format<"date-time">)
            | null,
          created_at: timelog.project.created_at.toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IHrmPlatformProject.ISummary,
        task: null,
      };
    } else {
      groupKey = timelog.task_id ?? "unassigned";
      groupData = {
        group_type: "task",
        employee: null,
        project: null,
        task: timelog.task
          ? ({
              id: timelog.task.id,
              title: timelog.task.title,
              status: timelog.task.status,
              priority: timelog.task.priority,
              due_date: timelog.task.due_date?.toISOString() as
                | (string & tags.Format<"date-time">)
                | null,
              estimated_hours: timelog.task.estimated_hours ?? null,
              assignee: timelog.task.assignee
                ? ({
                    id: timelog.task.assignee.id,
                    user: {
                      id: timelog.task.assignee.user.id,
                      display_name: timelog.task.assignee.user.display_name,
                      avatar_image: timelog.task.assignee.user.avatar_image,
                      phone_number: timelog.task.assignee.user.phone_number,
                    } satisfies IHrmPlatformMember.ISummary,
                    role: {
                      id: timelog.task.assignee.role.id,
                      name: timelog.task.assignee.role.name,
                      is_builtin: timelog.task.assignee.role.is_builtin,
                      description: null,
                      organization: {
                        id: timelog.task.assignee.role.organization.id,
                        name: timelog.task.assignee.role.organization.name,
                        description:
                          timelog.task.assignee.role.organization.description ??
                          null,
                        logo:
                          timelog.task.assignee.role.organization.logo ?? null,
                        currency:
                          timelog.task.assignee.role.organization.currency,
                        timezone:
                          timelog.task.assignee.role.organization.timezone,
                      } satisfies IHrmPlatformOrganization.ISummary,
                      created_at:
                        timelog.task.assignee.role.created_at.toISOString() as string &
                          tags.Format<"date-time">,
                    } satisfies IHrmPlatformRole.ISummary,
                    department: timelog.task.assignee.department
                      ? ({
                          id: timelog.task.assignee.department.id,
                          name: timelog.task.assignee.department.name,
                          description:
                            timelog.task.assignee.department.description ??
                            null,
                          parent: timelog.task.assignee.department
                            .parentDepartment
                            ? ({
                                id: timelog.task.assignee.department
                                  .parentDepartment.id,
                                name: timelog.task.assignee.department
                                  .parentDepartment.name,
                                description:
                                  timelog.task.assignee.department
                                    .parentDepartment.description ?? null,
                                parent: null,
                                created_at:
                                  timelog.task.assignee.department.parentDepartment.created_at.toISOString() as string &
                                    tags.Format<"date-time">,
                                deleted_at:
                                  timelog.task.assignee.department.parentDepartment.deleted_at?.toISOString() as
                                    | (string & tags.Format<"date-time">)
                                    | null,
                              } satisfies IHrmPlatformDepartment.ISummary)
                            : null,
                          created_at:
                            timelog.task.assignee.department.created_at.toISOString() as string &
                              tags.Format<"date-time">,
                          deleted_at:
                            timelog.task.assignee.department.deleted_at?.toISOString() as
                              | (string & tags.Format<"date-time">)
                              | null,
                        } satisfies IHrmPlatformDepartment.ISummary)
                      : null,
                    position: timelog.task.assignee.position ?? null,
                    employment_type: timelog.task.assignee.employment_type,
                    status: timelog.task.assignee.status,
                    created_at:
                      timelog.task.assignee.created_at.toISOString() as string &
                        tags.Format<"date-time">,
                  } satisfies IHrmPlatformEmployee.ISummary)
                : null,
              parentTask: timelog.task.parentTask
                ? ({
                    id: timelog.task.parentTask.id,
                    title: timelog.task.parentTask.title,
                    status: timelog.task.parentTask.status,
                    priority: timelog.task.parentTask.priority,
                    due_date:
                      timelog.task.parentTask.due_date?.toISOString() as
                        | (string & tags.Format<"date-time">)
                        | null,
                    estimated_hours:
                      timelog.task.parentTask.estimated_hours ?? null,
                    project: {
                      id: timelog.task.parentTask.project.id,
                      name: timelog.task.parentTask.project.name,
                      color_code: timelog.task.parentTask.project.color_code,
                      status: timelog.task.parentTask.project.status,
                      created_at:
                        timelog.task.parentTask.project.created_at.toISOString() as string &
                          tags.Format<"date-time">,
                    } satisfies IHrmPlatformProject.ISummary,
                    created_at:
                      timelog.task.parentTask.created_at.toISOString() as string &
                        tags.Format<"date-time">,
                  } satisfies IHrmPlatformTask.ISummary)
                : null,
              project: {
                id: timelog.task.project.id,
                name: timelog.task.project.name,
                color_code: timelog.task.project.color_code,
                status: timelog.task.project.status,
                created_at:
                  timelog.task.project.created_at.toISOString() as string &
                    tags.Format<"date-time">,
              } satisfies IHrmPlatformProject.ISummary,
              created_at: timelog.task.created_at.toISOString() as string &
                tags.Format<"date-time">,
            } satisfies IHrmPlatformTask.ISummary)
          : null,
      };
    }
    const existing = groupMap.get(groupKey);
    if (existing) {
      existing.total_minutes += timelog.duration_minutes;
      if (timelog.billable) {
        existing.billable_minutes += timelog.duration_minutes;
      } else {
        existing.non_billable_minutes += timelog.duration_minutes;
      }
    } else {
      groupMap.set(groupKey, {
        ...groupData,
        total_minutes: timelog.duration_minutes,
        billable_minutes: timelog.billable ? timelog.duration_minutes : 0,
        non_billable_minutes: timelog.billable ? 0 : timelog.duration_minutes,
      });
    }
  }
  let results = Array.from(groupMap.values());
  const sortField = props.body.sort ?? "totalHours";
  const direction = props.body.direction ?? "desc";
  results.sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;
    if (sortField === "totalHours") {
      aVal = a.total_minutes;
      bVal = b.total_minutes;
    } else if (sortField === "billableHours") {
      aVal = a.billable_minutes;
      bVal = b.billable_minutes;
    } else if (sortField === "nonBillableHours") {
      aVal = a.non_billable_minutes;
      bVal = b.non_billable_minutes;
    } else {
      if (a.group_type === "employee") {
        aVal = a.employee?.user.display_name ?? "";
        bVal = b.employee?.user.display_name ?? "";
      } else if (a.group_type === "project") {
        aVal = a.project?.name ?? "";
        bVal = b.project?.name ?? "";
      } else {
        aVal = a.task?.title ?? "";
        bVal = b.task?.title ?? "";
      }
    }
    if (typeof aVal === "string" && typeof bVal === "string") {
      return direction === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    return direction === "asc"
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });
  const total = results.length;
  const paginatedResults = results.slice(skip, skip + limit);
  const data = paginatedResults.map(
    (r) =>
      ({
        group_type: r.group_type,
        employee: r.employee,
        project: r.project,
        task: r.task,
        total_hours: Math.round((r.total_minutes / 60) * 100) / 100,
        billable_hours: Math.round((r.billable_minutes / 60) * 100) / 100,
        non_billable_hours:
          Math.round((r.non_billable_minutes / 60) * 100) / 100,
      }) satisfies IHrmPlatformTimeReport.ISummary,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIHrmPlatformTimeReport.ISummary;
}
