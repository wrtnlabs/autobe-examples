import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
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

export async function patchHrmPlatformMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmPlatformTimelog.IRequest;
}): Promise<IPageIHrmPlatformTimelog.ISummary> {
  // Get the authenticated member's employee record for current organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      hrm_platform_role_id: true,
    } satisfies Prisma.hrm_platform_employeesSelect,
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  // Check if user has time:view_all permission
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        hrm_platform_role_id: employee.hrm_platform_role_id,
      },
      select: {
        hrm_platform_permission_id: true,
      },
    });
  const permissionIds = new Set(
    rolePermissions.map((rp) => rp.hrm_platform_permission_id),
  );
  const permissions = await MyGlobal.prisma.hrm_platform_permissions.findMany({
    where: {
      id: {
        in: Array.from(permissionIds),
      },
    },
    select: {
      code: true,
    },
  });
  const canViewAll = permissions.some((p) => p.code === "time:view_all");
  // Build where clause
  const whereInput: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
    hrm_platform_employee_id: employee.id,
    ...(props.body.startDate && {
      date: {
        gte: props.body.startDate,
      },
    }),
    ...(props.body.endDate && {
      date: {
        lte: props.body.endDate,
      },
    }),
    ...(props.body.projectId && {
      hrm_platform_project_id: props.body.projectId,
    }),
    ...(props.body.taskId && {
      hrm_platform_task_id: props.body.taskId,
    }),
    ...(props.body.billable !== undefined && {
      billable: props.body.billable,
    }),
    ...(props.body.employeeId &&
      canViewAll && {
        hrm_platform_employee_id: props.body.employeeId,
      }),
    ...(props.body.search && {
      description: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.hrm_platform_timelogsWhereInput;
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query timelogs with summary data
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { date: "desc" as const },
    select: {
      id: true,
      date: true,
      duration_minutes: true,
      description: true,
      billable: true,
      hrm_platform_employee_id: true,
      hrm_platform_project_id: true,
      hrm_platform_task_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      employee: {
        select: {
          id: true,
          position: true,
          employment_type: true,
          status: true,
          hrm_platform_user_id: true,
          hrm_platform_role_id: true,
          hrm_platform_department_id: true,
          created_at: true,
          user: {
            select: {
              id: true,
              email: true,
              display_name: true,
              avatar_image: true,
              phone_number: true,
            } satisfies Prisma.hrm_platform_membersSelect,
          },
          role: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              is_builtin: true,
              created_at: true,
              deleted_at: true,
            } satisfies Prisma.hrm_platform_rolesSelect,
          },
          department: {
            select: {
              id: true,
              name: true,
              description: true,
              parent_department_id: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            } satisfies Prisma.hrm_platform_departmentsSelect,
          },
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
          hrm_platform_organization_id: true,
          created_at: true,
          updated_at: true,
        } satisfies Prisma.hrm_platform_projectsSelect,
      },
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          estimated_hours: true,
          due_date: true,
          hrm_platform_projects_id: true,
          hrm_platform_tasks_id: true,
          hrm_platform_employees_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          assignedEmployee: {
            select: {
              id: true,
              position: true,
              employment_type: true,
              status: true,
              hrm_platform_user_id: true,
              hrm_platform_role_id: true,
              hrm_platform_department_id: true,
              created_at: true,
            } satisfies Prisma.hrm_platform_employeesSelect,
          },
          parent: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              estimated_hours: true,
              due_date: true,
              hrm_platform_projects_id: true,
              hrm_platform_tasks_id: true,
              hrm_platform_employees_id: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            } satisfies Prisma.hrm_platform_tasksSelect,
          },
        },
      },
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: whereInput,
  });
  // Transform to DTO
  const data = await ArrayUtil.asyncMap(timelogs, async (timelog) => {
    const employeeSummary: IHrmPlatformEmployee.ISummary = {
      id: timelog.employee.id as string & tags.Format<"uuid">,
      position: timelog.employee.position,
      employment_type: timelog.employee.employment_type,
      status: timelog.employee.status,
      user: {
        id: timelog.employee.user.id as string & tags.Format<"uuid">,
        email: timelog.employee.user.email,
        display_name: timelog.employee.user.display_name,
        avatar_image: timelog.employee.user.avatar_image,
        phone_number: timelog.employee.user.phone_number,
      } satisfies IHrmPlatformMember.ISummary,
      role: {
        id: timelog.employee.role.id as string & tags.Format<"uuid">,
        code: timelog.employee.role.code,
        name: timelog.employee.role.name,
        description: timelog.employee.role.description,
        is_builtin: timelog.employee.role.is_builtin,
        permissions: permissions.map((p) => p.code),
        created_at: toISOStringSafe(timelog.employee.role.created_at),
        deleted_at: timelog.employee.role.deleted_at
          ? toISOStringSafe(timelog.employee.role.deleted_at)
          : null,
      } satisfies IHrmPlatformRole.ISummary,
      department: timelog.employee.department
        ? ({
            id: timelog.employee.department.id as string & tags.Format<"uuid">,
            name: timelog.employee.department.name,
            description: timelog.employee.department.description,
            parent_department: timelog.employee.department.parent_department_id
              ? ({
                  id: timelog.employee.department
                    .parent_department_id as string & tags.Format<"uuid">,
                  name: "",
                  description: "",
                  parent_department: null,
                  created_at: toISOStringSafe(new Date()),
                  updated_at: toISOStringSafe(new Date()),
                  deleted_at: null,
                } satisfies IHrmPlatformDepartment.ISummary)
              : null,
            created_at: toISOStringSafe(timelog.employee.department.created_at),
            updated_at: toISOStringSafe(timelog.employee.department.updated_at),
            deleted_at: timelog.employee.department.deleted_at
              ? toISOStringSafe(timelog.employee.department.deleted_at)
              : null,
          } satisfies IHrmPlatformDepartment.ISummary)
        : null,
      created_at: toISOStringSafe(timelog.employee.created_at),
    } satisfies IHrmPlatformEmployee.ISummary;
    const projectSummary: IHrmPlatformProject.ISummary = {
      id: timelog.project.id as string & tags.Format<"uuid">,
      name: timelog.project.name,
      color_code: timelog.project.color_code,
      status: timelog.project.status,
      budget_hours: timelog.project.budget_hours,
      start_date: timelog.project.start_date
        ? toISOStringSafe(timelog.project.start_date)
        : null,
      end_date: timelog.project.end_date
        ? toISOStringSafe(timelog.project.end_date)
        : null,
      organization: {
        id: "" as string & tags.Format<"uuid">,
        name: "",
        description: null,
        logo_url: null,
        currency: "",
        timezone: "",
        fiscal_start_month: 1,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      } satisfies IHrmPlatformOrganization.ISummary,
      member_count: 0,
      created_at: toISOStringSafe(timelog.project.created_at),
      updated_at: toISOStringSafe(timelog.project.updated_at),
    } satisfies IHrmPlatformProject.ISummary;
    const taskSummary: IHrmPlatformTask.ISummary | null | undefined =
      timelog.task
        ? ({
            id: timelog.task.id as string & tags.Format<"uuid">,
            title: timelog.task.title,
            status: timelog.task.status,
            priority: timelog.task.priority,
            estimated_hours: timelog.task.estimated_hours,
            due_date: timelog.task.due_date
              ? toISOStringSafe(timelog.task.due_date)
              : null,
            created_at: toISOStringSafe(timelog.task.created_at),
            updated_at: toISOStringSafe(timelog.task.updated_at),
            deleted_at: timelog.task.deleted_at
              ? toISOStringSafe(timelog.task.deleted_at)
              : null,
            project: {
              id: "" as string & tags.Format<"uuid">,
              name: "",
              color_code: "",
              status: "",
              budget_hours: null,
              start_date: null,
              end_date: null,
              organization: {
                id: "" as string & tags.Format<"uuid">,
                name: "",
                description: null,
                logo_url: null,
                currency: "",
                timezone: "",
                fiscal_start_month: 1,
                created_at: toISOStringSafe(new Date()),
                updated_at: toISOStringSafe(new Date()),
              } satisfies IHrmPlatformOrganization.ISummary,
              member_count: 0,
              created_at: toISOStringSafe(new Date()),
              updated_at: toISOStringSafe(new Date()),
            } satisfies IHrmPlatformProject.ISummary,
            assignedEmployee: timelog.task.assignedEmployee
              ? ({
                  id: timelog.task.assignedEmployee.id as string &
                    tags.Format<"uuid">,
                  position: timelog.task.assignedEmployee.position,
                  employment_type:
                    timelog.task.assignedEmployee.employment_type,
                  status: timelog.task.assignedEmployee.status,
                  user: {
                    id: "" as string & tags.Format<"uuid">,
                    email: "" as string & tags.Format<"email">,
                    display_name: "",
                  } satisfies IHrmPlatformMember.ISummary,
                  role: {
                    id: "" as string & tags.Format<"uuid">,
                    code: "",
                    name: "",
                    is_builtin: false,
                    permissions: [],
                    created_at: "" as string & tags.Format<"date-time">,
                    deleted_at: null,
                  } satisfies IHrmPlatformRole.ISummary,
                  department: null,
                  created_at: toISOStringSafe(
                    timelog.task.assignedEmployee.created_at,
                  ),
                } satisfies IHrmPlatformEmployee.ISummary)
              : null,
            parent: timelog.task.parent
              ? ({
                  id: timelog.task.parent.id as string & tags.Format<"uuid">,
                  title: timelog.task.parent.title,
                  status: timelog.task.parent.status,
                  priority: timelog.task.parent.priority,
                  estimated_hours: timelog.task.parent.estimated_hours,
                  due_date: timelog.task.parent.due_date
                    ? toISOStringSafe(timelog.task.parent.due_date)
                    : null,
                  created_at: toISOStringSafe(timelog.task.parent.created_at),
                  updated_at: toISOStringSafe(timelog.task.parent.updated_at),
                  deleted_at: timelog.task.parent.deleted_at
                    ? toISOStringSafe(timelog.task.parent.deleted_at)
                    : null,
                  project: {
                    id: "" as string & tags.Format<"uuid">,
                    name: "",
                    color_code: "",
                    status: "",
                    budget_hours: null,
                    start_date: null,
                    end_date: null,
                    organization: {
                      id: "" as string & tags.Format<"uuid">,
                      name: "",
                      description: null,
                      logo_url: null,
                      currency: "",
                      timezone: "",
                      fiscal_start_month: 1,
                      created_at: toISOStringSafe(new Date()),
                      updated_at: toISOStringSafe(new Date()),
                    } satisfies IHrmPlatformOrganization.ISummary,
                    member_count: 0,
                    created_at: toISOStringSafe(new Date()),
                    updated_at: toISOStringSafe(new Date()),
                  } satisfies IHrmPlatformProject.ISummary,
                  assignedEmployee: null,
                  parent: null,
                } satisfies IHrmPlatformTask.ISummary)
              : null,
          } satisfies IHrmPlatformTask.ISummary)
        : null;
    return {
      id: timelog.id as string & tags.Format<"uuid">,
      date: toISOStringSafe(timelog.date),
      duration_minutes: timelog.duration_minutes,
      description: timelog.description,
      billable: timelog.billable,
      employee: employeeSummary,
      project: projectSummary,
      task: taskSummary,
      created_at: toISOStringSafe(timelog.created_at),
      updated_at: toISOStringSafe(timelog.updated_at),
      deleted_at: timelog.deleted_at
        ? toISOStringSafe(timelog.deleted_at)
        : null,
    } satisfies IHrmPlatformTimelog.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIHrmPlatformTimelog.ISummary;
}
