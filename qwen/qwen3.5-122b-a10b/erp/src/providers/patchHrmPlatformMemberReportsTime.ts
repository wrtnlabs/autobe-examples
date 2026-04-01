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
  // Validate date range
  const startDate = props.body.startDate;
  const endDate = props.body.endDate;
  if (startDate > endDate) {
    throw new HttpException("startDate must be <= endDate", 400);
  }
  // Validate groupBy
  const groupBy: "employee" | "project" | "task" = props.body.groupBy;
  if (!groupBy || !["employee", "project", "task"].includes(groupBy)) {
    throw new HttpException("Invalid groupBy value", 400);
  }
  // Build where condition for timelogs
  const whereInput: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
    date: {
      gte: startDate,
      lte: endDate,
    },
    ...(props.body.employee_id && {
      hrm_platform_employee_id: props.body.employee_id,
    }),
    ...(props.body.project_id && {
      hrm_platform_project_id: props.body.project_id,
    }),
    ...(props.body.billable !== undefined && {
      billable: props.body.billable,
    }),
  } satisfies Prisma.hrm_platform_timelogsWhereInput;
  // Get pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get total count
  const total = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: whereInput,
  });
  // Get timelogs for aggregation
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: whereInput,
    select: {
      id: true,
      hrm_platform_employee_id: true,
      hrm_platform_project_id: true,
      hrm_platform_task_id: true,
      date: true,
      duration_minutes: true,
      billable: true,
    },
    skip,
    take: limit,
  });
  // Group timelogs by dimension
  const grouped = new Map<
    string,
    {
      totalMinutes: number;
      billableMinutes: number;
      nonBillableMinutes: number;
    }
  >();
  for (const timelog of timelogs) {
    let key: string;
    switch (groupBy) {
      case "employee":
        key = timelog.hrm_platform_employee_id;
        break;
      case "project":
        key = timelog.hrm_platform_project_id;
        break;
      case "task":
        key = timelog.hrm_platform_task_id ?? "__unassigned__";
        break;
    }
    const existing = grouped.get(key) ?? {
      totalMinutes: 0,
      billableMinutes: 0,
      nonBillableMinutes: 0,
    };
    existing.totalMinutes += timelog.duration_minutes;
    if (timelog.billable) {
      existing.billableMinutes += timelog.duration_minutes;
    } else {
      existing.nonBillableMinutes += timelog.duration_minutes;
    }
    grouped.set(key, existing);
  }
  // Build report entries
  const data = await ArrayUtil.asyncMap(
    Array.from(grouped.entries()),
    async ([key, metrics]) => {
      let employee: IHrmPlatformEmployee.ISummary | undefined;
      let project: IHrmPlatformProject.ISummary | undefined;
      let task: IHrmPlatformTask.ISummary | undefined;
      switch (groupBy) {
        case "employee": {
          const emp = await MyGlobal.prisma.hrm_platform_employees.findUnique({
            where: { id: key },
            select: {
              id: true,
              position: true,
              employment_type: true,
              status: true,
              hrm_platform_user_id: true,
              hrm_platform_role_id: true,
              hrm_platform_department_id: true,
              created_at: true,
            },
          });
          if (emp) {
            const user = await MyGlobal.prisma.hrm_platform_members.findUnique({
              where: { id: emp.hrm_platform_user_id },
              select: {
                id: true,
                email: true,
                display_name: true,
                avatar_image: true,
                phone_number: true,
              },
            });
            const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
              where: { id: emp.hrm_platform_role_id },
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                is_builtin: true,
                created_at: true,
                deleted_at: true,
              },
            });
            const permissions = role
              ? await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
                  where: { hrm_platform_role_id: role.id },
                  select: { hrm_platform_permission_id: true },
                })
              : [];
            const permissionCodes = permissions.length
              ? await MyGlobal.prisma.hrm_platform_permissions.findMany({
                  where: {
                    id: {
                      in: permissions.map((p) => p.hrm_platform_permission_id),
                    },
                  },
                  select: { code: true },
                })
              : [];
            const department = emp.hrm_platform_department_id
              ? await MyGlobal.prisma.hrm_platform_departments.findUnique({
                  where: { id: emp.hrm_platform_department_id },
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    parent_department_id: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                })
              : null;
            employee = {
              id: typia.assert<string & tags.Format<"uuid">>(emp.id),
              position: emp.position,
              employment_type: emp.employment_type,
              status: emp.status,
              user: {
                id: typia.assert<string & tags.Format<"uuid">>(user?.id ?? ""),
                email: typia.assert<string & tags.Format<"email">>(
                  user?.email ?? "",
                ),
                display_name: user?.display_name ?? "",
                avatar_image: user?.avatar_image ?? undefined,
                phone_number: user?.phone_number ?? undefined,
              } satisfies IHrmPlatformMember.ISummary,
              role: {
                id: typia.assert<string & tags.Format<"uuid">>(role?.id ?? ""),
                code: role?.code ?? "",
                name: role?.name ?? "",
                description: role?.description ?? undefined,
                is_builtin: role?.is_builtin ?? false,
                permissions: permissionCodes.map((p) => p.code),
                created_at: typia.assert<string & tags.Format<"date-time">>(
                  toISOStringSafe(role?.created_at ?? new Date()),
                ),
                deleted_at: role?.deleted_at
                  ? toISOStringSafe(role.deleted_at)
                  : null,
              } satisfies IHrmPlatformRole.ISummary,
              department: department
                ? ({
                    id: typia.assert<string & tags.Format<"uuid">>(
                      department.id,
                    ),
                    name: department.name,
                    description: department.description ?? undefined,
                    parent_department: null,
                    created_at: typia.assert<string & tags.Format<"date-time">>(
                      toISOStringSafe(department.created_at),
                    ),
                    updated_at: typia.assert<string & tags.Format<"date-time">>(
                      toISOStringSafe(department.updated_at),
                    ),
                    deleted_at: department.deleted_at
                      ? toISOStringSafe(department.deleted_at)
                      : undefined,
                  } satisfies IHrmPlatformDepartment.ISummary)
                : null,
              created_at: typia.assert<string & tags.Format<"date-time">>(
                toISOStringSafe(emp.created_at),
              ),
            } satisfies IHrmPlatformEmployee.ISummary;
          }
          break;
        }
        case "project": {
          const proj = await MyGlobal.prisma.hrm_platform_projects.findUnique({
            where: { id: key },
            select: {
              id: true,
              name: true,
              color_code: true,
              status: true,
              budget_hours: true,
              start_date: true,
              end_date: true,
              hrm_platform_organization_id: true,
              created_at: true,
              updated_at: true,
            },
          });
          if (proj) {
            const org =
              await MyGlobal.prisma.hrm_platform_organizations.findUnique({
                where: { id: proj.hrm_platform_organization_id },
                select: {
                  id: true,
                  name: true,
                  description: true,
                  logo_url: true,
                  currency: true,
                  timezone: true,
                  fiscal_start_month: true,
                  created_at: true,
                  updated_at: true,
                },
              });
            const memberCount =
              await MyGlobal.prisma.hrm_platform_project_members.count({
                where: { hrm_platform_project_id: proj.id, deleted_at: null },
              });
            project = {
              id: typia.assert<string & tags.Format<"uuid">>(proj.id),
              name: proj.name,
              color_code: proj.color_code,
              status: proj.status,
              budget_hours: proj.budget_hours ?? undefined,
              start_date: proj.start_date
                ? typia.assert<string & tags.Format<"date-time">>(
                    toISOStringSafe(proj.start_date),
                  )
                : undefined,
              end_date: proj.end_date
                ? typia.assert<string & tags.Format<"date-time">>(
                    toISOStringSafe(proj.end_date),
                  )
                : undefined,
              organization: {
                id: typia.assert<string & tags.Format<"uuid">>(org?.id ?? ""),
                name: org?.name ?? "",
                description: org?.description ?? undefined,
                logo_url: org?.logo_url ?? undefined,
                currency: org?.currency ?? "",
                timezone: org?.timezone ?? "",
                fiscal_start_month: org?.fiscal_start_month ?? 1,
                created_at: typia.assert<string & tags.Format<"date-time">>(
                  toISOStringSafe(org?.created_at ?? new Date()),
                ),
                updated_at: typia.assert<string & tags.Format<"date-time">>(
                  toISOStringSafe(org?.updated_at ?? new Date()),
                ),
              } satisfies IHrmPlatformOrganization.ISummary,
              member_count: typia.assert<number & tags.Type<"int32">>(
                memberCount,
              ),
              created_at: typia.assert<string & tags.Format<"date-time">>(
                toISOStringSafe(proj.created_at),
              ),
              updated_at: typia.assert<string & tags.Format<"date-time">>(
                toISOStringSafe(proj.updated_at),
              ),
            } satisfies IHrmPlatformProject.ISummary;
          }
          break;
        }
        case "task": {
          if (key !== "__unassigned__") {
            const taskRec = await MyGlobal.prisma.hrm_platform_tasks.findUnique(
              {
                where: { id: key },
                select: {
                  id: true,
                  title: true,
                  status: true,
                  priority: true,
                  estimated_hours: true,
                  due_date: true,
                  hrm_platform_projects_id: true,
                  hrm_platform_employees_id: true,
                  hrm_platform_tasks_id: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            );
            if (taskRec) {
              const proj =
                await MyGlobal.prisma.hrm_platform_projects.findUnique({
                  where: { id: taskRec.hrm_platform_projects_id },
                  select: {
                    id: true,
                    name: true,
                    color_code: true,
                    status: true,
                    budget_hours: true,
                    start_date: true,
                    end_date: true,
                    hrm_platform_organization_id: true,
                    created_at: true,
                    updated_at: true,
                  },
                });
              const org = proj?.hrm_platform_organization_id
                ? await MyGlobal.prisma.hrm_platform_organizations.findUnique({
                    where: { id: proj.hrm_platform_organization_id },
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      logo_url: true,
                      currency: true,
                      timezone: true,
                      fiscal_start_month: true,
                      created_at: true,
                      updated_at: true,
                    },
                  })
                : null;
              const assignedEmp = taskRec.hrm_platform_employees_id
                ? await MyGlobal.prisma.hrm_platform_employees.findUnique({
                    where: { id: taskRec.hrm_platform_employees_id },
                    select: {
                      id: true,
                      position: true,
                      employment_type: true,
                      status: true,
                      hrm_platform_user_id: true,
                      hrm_platform_role_id: true,
                      hrm_platform_department_id: true,
                      created_at: true,
                    },
                  })
                : null;
              const assignedUser = assignedEmp?.hrm_platform_user_id
                ? await MyGlobal.prisma.hrm_platform_members.findUnique({
                    where: { id: assignedEmp.hrm_platform_user_id },
                    select: {
                      id: true,
                      email: true,
                      display_name: true,
                      avatar_image: true,
                      phone_number: true,
                    },
                  })
                : null;
              const assignedRole = assignedEmp?.hrm_platform_role_id
                ? await MyGlobal.prisma.hrm_platform_roles.findUnique({
                    where: { id: assignedEmp.hrm_platform_role_id },
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      description: true,
                      is_builtin: true,
                      created_at: true,
                      deleted_at: true,
                    },
                  })
                : null;
              const parentTask = taskRec.hrm_platform_tasks_id
                ? await MyGlobal.prisma.hrm_platform_tasks.findUnique({
                    where: { id: taskRec.hrm_platform_tasks_id },
                    select: {
                      id: true,
                      title: true,
                      status: true,
                      priority: true,
                      estimated_hours: true,
                      due_date: true,
                      created_at: true,
                      updated_at: true,
                      deleted_at: true,
                    },
                  })
                : null;
              task = {
                id: typia.assert<string & tags.Format<"uuid">>(taskRec.id),
                title: taskRec.title,
                status: taskRec.status,
                priority: taskRec.priority,
                estimated_hours: taskRec.estimated_hours ?? undefined,
                due_date: taskRec.due_date
                  ? typia.assert<string & tags.Format<"date-time">>(
                      toISOStringSafe(taskRec.due_date),
                    )
                  : undefined,
                created_at: typia.assert<string & tags.Format<"date-time">>(
                  toISOStringSafe(taskRec.created_at),
                ),
                updated_at: typia.assert<string & tags.Format<"date-time">>(
                  toISOStringSafe(taskRec.updated_at),
                ),
                deleted_at: taskRec.deleted_at
                  ? toISOStringSafe(taskRec.deleted_at)
                  : null,
                project: {
                  id: typia.assert<string & tags.Format<"uuid">>(
                    proj?.id ?? "",
                  ),
                  name: proj?.name ?? "",
                  color_code: proj?.color_code ?? "",
                  status: proj?.status ?? "",
                  budget_hours: proj?.budget_hours ?? undefined,
                  start_date: proj?.start_date
                    ? typia.assert<string & tags.Format<"date-time">>(
                        toISOStringSafe(proj.start_date),
                      )
                    : undefined,
                  end_date: proj?.end_date
                    ? typia.assert<string & tags.Format<"date-time">>(
                        toISOStringSafe(proj.end_date),
                      )
                    : undefined,
                  organization: {
                    id: typia.assert<string & tags.Format<"uuid">>(
                      org?.id ?? "",
                    ),
                    name: org?.name ?? "",
                    description: org?.description ?? undefined,
                    logo_url: org?.logo_url ?? undefined,
                    currency: org?.currency ?? "",
                    timezone: org?.timezone ?? "",
                    fiscal_start_month: org?.fiscal_start_month ?? 1,
                    created_at: typia.assert<string & tags.Format<"date-time">>(
                      toISOStringSafe(org?.created_at ?? new Date()),
                    ),
                    updated_at: typia.assert<string & tags.Format<"date-time">>(
                      toISOStringSafe(org?.updated_at ?? new Date()),
                    ),
                  } satisfies IHrmPlatformOrganization.ISummary,
                  member_count: 0,
                  created_at: typia.assert<string & tags.Format<"date-time">>(
                    toISOStringSafe(proj?.created_at ?? new Date()),
                  ),
                  updated_at: typia.assert<string & tags.Format<"date-time">>(
                    toISOStringSafe(proj?.updated_at ?? new Date()),
                  ),
                } satisfies IHrmPlatformProject.ISummary,
                assignedEmployee: assignedEmp
                  ? ({
                      id: typia.assert<string & tags.Format<"uuid">>(
                        assignedEmp.id,
                      ),
                      position: assignedEmp.position,
                      employment_type: assignedEmp.employment_type,
                      status: assignedEmp.status,
                      user: {
                        id: typia.assert<string & tags.Format<"uuid">>(
                          assignedUser?.id ?? "",
                        ),
                        email: typia.assert<string & tags.Format<"email">>(
                          assignedUser?.email ?? "",
                        ),
                        display_name: assignedUser?.display_name ?? "",
                        avatar_image: assignedUser?.avatar_image ?? undefined,
                        phone_number: assignedUser?.phone_number ?? undefined,
                      } satisfies IHrmPlatformMember.ISummary,
                      role: {
                        id: typia.assert<string & tags.Format<"uuid">>(
                          assignedRole?.id ?? "",
                        ),
                        code: assignedRole?.code ?? "",
                        name: assignedRole?.name ?? "",
                        description: assignedRole?.description ?? undefined,
                        is_builtin: assignedRole?.is_builtin ?? false,
                        permissions: [],
                        created_at: typia.assert<
                          string & tags.Format<"date-time">
                        >(
                          toISOStringSafe(
                            assignedRole?.created_at ?? new Date(),
                          ),
                        ),
                        deleted_at: assignedRole?.deleted_at
                          ? toISOStringSafe(assignedRole.deleted_at)
                          : null,
                      } satisfies IHrmPlatformRole.ISummary,
                      department: null,
                      created_at: typia.assert<
                        string & tags.Format<"date-time">
                      >(toISOStringSafe(assignedEmp.created_at)),
                    } satisfies IHrmPlatformEmployee.ISummary)
                  : null,
                parent: parentTask
                  ? ({
                      id: typia.assert<string & tags.Format<"uuid">>(
                        parentTask.id,
                      ),
                      title: parentTask.title,
                      status: parentTask.status,
                      priority: parentTask.priority,
                      estimated_hours: parentTask.estimated_hours ?? undefined,
                      due_date: parentTask.due_date
                        ? typia.assert<string & tags.Format<"date-time">>(
                            toISOStringSafe(parentTask.due_date),
                          )
                        : undefined,
                      created_at: typia.assert<
                        string & tags.Format<"date-time">
                      >(toISOStringSafe(parentTask.created_at)),
                      updated_at: typia.assert<
                        string & tags.Format<"date-time">
                      >(toISOStringSafe(parentTask.updated_at)),
                      deleted_at: parentTask.deleted_at
                        ? toISOStringSafe(parentTask.deleted_at)
                        : null,
                      project: {
                        id: typia.assert<string & tags.Format<"uuid">>(
                          proj?.id ?? "",
                        ),
                        name: proj?.name ?? "",
                        color_code: proj?.color_code ?? "",
                        status: proj?.status ?? "",
                        budget_hours: proj?.budget_hours ?? undefined,
                        start_date: proj?.start_date
                          ? typia.assert<string & tags.Format<"date-time">>(
                              toISOStringSafe(proj.start_date),
                            )
                          : undefined,
                        end_date: proj?.end_date
                          ? typia.assert<string & tags.Format<"date-time">>(
                              toISOStringSafe(proj.end_date),
                            )
                          : undefined,
                        organization: {
                          id: typia.assert<string & tags.Format<"uuid">>(
                            org?.id ?? "",
                          ),
                          name: org?.name ?? "",
                          description: org?.description ?? undefined,
                          logo_url: org?.logo_url ?? undefined,
                          currency: org?.currency ?? "",
                          timezone: org?.timezone ?? "",
                          fiscal_start_month: org?.fiscal_start_month ?? 1,
                          created_at: typia.assert<
                            string & tags.Format<"date-time">
                          >(toISOStringSafe(org?.created_at ?? new Date())),
                          updated_at: typia.assert<
                            string & tags.Format<"date-time">
                          >(toISOStringSafe(org?.updated_at ?? new Date())),
                        } satisfies IHrmPlatformOrganization.ISummary,
                        member_count: 0,
                        created_at: typia.assert<
                          string & tags.Format<"date-time">
                        >(toISOStringSafe(proj?.created_at ?? new Date())),
                        updated_at: typia.assert<
                          string & tags.Format<"date-time">
                        >(toISOStringSafe(proj?.updated_at ?? new Date())),
                      } satisfies IHrmPlatformProject.ISummary,
                      assignedEmployee: null,
                      parent: null,
                    } satisfies IHrmPlatformTask.ISummary)
                  : null,
              } satisfies IHrmPlatformTask.ISummary;
            }
          }
          break;
        }
      }
      return {
        id: typia.assert<string & tags.Format<"uuid">>(v4()),
        employee,
        project,
        task,
        total_hours: metrics.totalMinutes / 60,
        billable_hours: metrics.billableMinutes / 60,
        non_billable_hours: metrics.nonBillableMinutes / 60,
        date_range: {
          start: startDate,
          end: endDate,
        },
      } satisfies IHrmPlatformTimeReport.ISummary;
    },
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
