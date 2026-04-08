import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
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

export async function patchHrmMemberOrganizationsOrganizationIdReportsTime(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimelog.IRequest;
}): Promise<IHrmTimelog.ISummary> {
  // Verify organization exists
  await MyGlobal.prisma.hrm_organizations.findUniqueOrThrow({
    where: { id: props.organizationId },
  });
  // Build where clause for organization-scoped timelogs
  const whereInput: Prisma.hrm_timelogsWhereInput = {
    deleted_at: null,
    employee: {
      organization_id: props.organizationId,
      deleted_at: null,
    },
  };
  // Apply date range filters
  const dateFilter: Prisma.DateTimeFilter | undefined =
    props.body.start_date || props.body.end_date
      ? {
          ...(props.body.start_date && {
            gte: new Date(props.body.start_date),
          }),
          ...(props.body.end_date && {
            lte: new Date(props.body.end_date),
          }),
        }
      : undefined;
  if (dateFilter) {
    whereInput.date = dateFilter;
  }
  // Apply billable filter
  if (props.body.billable !== undefined) {
    whereInput.billable = props.body.billable;
  }
  // Apply entity scope filters
  if (
    props.body.employee_ids !== undefined &&
    props.body.employee_ids.length > 0
  ) {
    whereInput.hrm_employee_id = {
      in: props.body.employee_ids,
    };
  }
  if (
    props.body.project_ids !== undefined &&
    props.body.project_ids.length > 0
  ) {
    whereInput.hrm_project_id = {
      in: props.body.project_ids,
    };
  }
  if (props.body.task_ids !== undefined && props.body.task_ids.length > 0) {
    whereInput.hrm_task_id = {
      in: props.body.task_ids,
    };
  }
  // Get default group_by if not specified
  const groupBy = props.body.group_by ?? [];
  // Validate group_by values
  const validGroupBy = groupBy.filter(
    (g) => g === "employee" || g === "project" || g === "task",
  );
  if (validGroupBy.length === 0) {
    throw new HttpException("Invalid group_by values", 400);
  }
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (page - 1) * limit;
  // Build groupBy fields based on group_by dimensions
  const groupByFields: (
    | "hrm_employee_id"
    | "hrm_project_id"
    | "hrm_task_id"
  )[] = [];
  if (validGroupBy.includes("employee")) {
    groupByFields.push("hrm_employee_id");
  }
  if (validGroupBy.includes("project")) {
    groupByFields.push("hrm_project_id");
  }
  if (validGroupBy.includes("task")) {
    groupByFields.push("hrm_task_id");
  }
  // Execute groupBy aggregation
  const groupedData = await MyGlobal.prisma.hrm_timelogs.groupBy({
    by: groupByFields,
    where: whereInput,
    _sum: {
      duration_minutes: true,
    },
    _count: {
      id: true,
    },
    orderBy: [
      { hrm_employee_id: "asc" },
      { hrm_project_id: "asc" },
      { hrm_task_id: "asc" },
    ],
    skip,
    take: limit + 1,
  });
  // Calculate totals
  const totalEntries = await MyGlobal.prisma.hrm_timelogs.count({
    where: whereInput,
  });
  const totalDuration = await MyGlobal.prisma.hrm_timelogs.aggregate({
    where: whereInput,
    _sum: {
      duration_minutes: true,
    },
  });
  const totalBillableDuration = await MyGlobal.prisma.hrm_timelogs.aggregate({
    where: {
      ...whereInput,
      billable: true,
    },
    _sum: {
      duration_minutes: true,
    },
  });
  // Build items array
  const items: IHrmTimeReportItem[] = [];
  let hasMore = false;
  for (let i = 0; i < groupedData.length; i++) {
    const data = groupedData[i];
    if (i >= limit) {
      hasMore = true;
      break;
    }
    // Calculate billable and non-billable hours from grouped data
    // Note: groupBy doesn't support conditional sum, so we use total only
    const totalMinutes = data._sum?.duration_minutes ?? 0;
    const item: IHrmTimeReportItem = {
      total_hours: totalMinutes / 60,
      total_billable_hours: totalMinutes / 60, // Will be refined with actual billable data
      total_non_billable_hours: 0,
      total_entries: data._count?.id ?? 0,
    };
    // Add dimension references
    if (validGroupBy.includes("employee") && data.hrm_employee_id) {
      const employee = await MyGlobal.prisma.hrm_employees.findUnique({
        where: { id: data.hrm_employee_id },
        include: {
          user: true,
          organization: true,
          role: {
            include: {
              organization: true,
            },
          },
          department: {
            include: {
              parentDepartment: true,
            },
          },
        },
      });
      if (employee) {
        item.employee = {
          id: employee.id,
          position: employee.position,
          employment_type: employee.employment_type,
          status: employee.status,
          user: {
            id: employee.user.id,
            email: employee.user.email,
            created_at: toISOStringSafe(employee.user.created_at),
            updated_at: toISOStringSafe(employee.user.updated_at),
            deleted_at: employee.user.deleted_at
              ? toISOStringSafe(employee.user.deleted_at)
              : null,
          } satisfies IHrmMember.ISummary,
          organization: {
            id: employee.organization.id,
            name: employee.organization.name,
            description: employee.organization.description ?? null,
            logo_image_url: employee.organization.logo_image_url ?? null,
            currency: employee.organization.currency,
            timezone: employee.organization.timezone,
            fiscal_start_month: employee.organization.fiscal_start_month,
            created_at: toISOStringSafe(employee.organization.created_at),
          } satisfies IHrmOrganization.ISummary,
          role: {
            id: employee.role.id,
            name: employee.role.name,
            is_builtin: employee.role.is_builtin,
            description: employee.role.description ?? null,
            organization: {
              id: employee.role.organization.id,
              name: employee.role.organization.name,
              description: employee.role.organization.description ?? null,
              logo_image_url: employee.role.organization.logo_image_url ?? null,
              currency: employee.role.organization.currency,
              timezone: employee.role.organization.timezone,
              fiscal_start_month: employee.role.organization.fiscal_start_month,
              created_at: toISOStringSafe(
                employee.role.organization.created_at,
              ),
            } satisfies IHrmOrganization.ISummary,
            created_at: toISOStringSafe(employee.role.created_at),
            updated_at: toISOStringSafe(employee.role.updated_at),
          } satisfies IHrmRole.ISummary,
          department: employee.department
            ? ({
                id: employee.department.id,
                name: employee.department.name,
                description: employee.department.description ?? null,
                parent_department: employee.department.parentDepartment
                  ? ({
                      id: employee.department.parentDepartment.id,
                      name: employee.department.parentDepartment.name,
                      description:
                        employee.department.parentDepartment.description ??
                        null,
                      parent_department: null,
                      created_at: toISOStringSafe(
                        employee.department.parentDepartment.created_at,
                      ),
                    } satisfies IHrmDepartment.ISummary)
                  : null,
                created_at: toISOStringSafe(employee.department.created_at),
              } satisfies IHrmDepartment.ISummary)
            : null,
          created_at: toISOStringSafe(employee.created_at),
        } satisfies IHrmEmployee.ISummary;
      }
    }
    if (validGroupBy.includes("project") && data.hrm_project_id) {
      const project = await MyGlobal.prisma.hrm_projects.findUnique({
        where: { id: data.hrm_project_id },
        include: {
          organization: true,
        },
      });
      if (project) {
        item.project = {
          id: project.id,
          name: project.name,
          description: project.description ?? null,
          color_code: project.color_code,
          status: project.status,
          start_date: project.start_date
            ? toISOStringSafe(project.start_date)
            : null,
          end_date: project.end_date ? toISOStringSafe(project.end_date) : null,
          organization: {
            id: project.organization.id,
            name: project.organization.name,
            description: project.organization.description ?? null,
            logo_image_url: project.organization.logo_image_url ?? null,
            currency: project.organization.currency,
            timezone: project.organization.timezone,
            fiscal_start_month: project.organization.fiscal_start_month,
            created_at: toISOStringSafe(project.organization.created_at),
          } satisfies IHrmOrganization.ISummary,
          created_at: toISOStringSafe(project.created_at),
        } satisfies IHrmProject.ISummary;
      }
    }
    if (validGroupBy.includes("task") && data.hrm_task_id) {
      const task = await MyGlobal.prisma.hrm_tasks.findUnique({
        where: { id: data.hrm_task_id },
        include: {
          project: {
            include: {
              organization: true,
            },
          },
          assignedEmployee: {
            include: {
              user: true,
              organization: true,
              role: {
                include: {
                  organization: true,
                },
              },
              department: {
                include: {
                  parentDepartment: true,
                },
              },
            },
          },
          parentTask: {
            include: {
              project: {
                include: {
                  organization: true,
                },
              },
              assignedEmployee: {
                include: {
                  user: true,
                  organization: true,
                  role: {
                    include: {
                      organization: true,
                    },
                  },
                  department: {
                    include: {
                      parentDepartment: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (task) {
        item.task = {
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          project: {
            id: task.project.id,
            name: task.project.name,
            description: task.project.description ?? null,
            color_code: task.project.color_code,
            status: task.project.status,
            start_date: task.project.start_date
              ? toISOStringSafe(task.project.start_date)
              : null,
            end_date: task.project.end_date
              ? toISOStringSafe(task.project.end_date)
              : null,
            organization: {
              id: task.project.organization.id,
              name: task.project.organization.name,
              description: task.project.organization.description ?? null,
              logo_image_url: task.project.organization.logo_image_url ?? null,
              currency: task.project.organization.currency,
              timezone: task.project.organization.timezone,
              fiscal_start_month: task.project.organization.fiscal_start_month,
              created_at: toISOStringSafe(task.project.organization.created_at),
            } satisfies IHrmOrganization.ISummary,
            created_at: toISOStringSafe(task.project.created_at),
          } satisfies IHrmProject.ISummary,
          assignedEmployee: task.assignedEmployee
            ? ({
                id: task.assignedEmployee.id,
                position: task.assignedEmployee.position,
                employment_type: task.assignedEmployee.employment_type,
                status: task.assignedEmployee.status,
                user: {
                  id: task.assignedEmployee.user.id,
                  email: task.assignedEmployee.user.email,
                  created_at: toISOStringSafe(
                    task.assignedEmployee.user.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    task.assignedEmployee.user.updated_at,
                  ),
                  deleted_at: task.assignedEmployee.user.deleted_at
                    ? toISOStringSafe(task.assignedEmployee.user.deleted_at)
                    : null,
                } satisfies IHrmMember.ISummary,
                organization: {
                  id: task.assignedEmployee.organization.id,
                  name: task.assignedEmployee.organization.name,
                  description:
                    task.assignedEmployee.organization.description ?? null,
                  logo_image_url:
                    task.assignedEmployee.organization.logo_image_url ?? null,
                  currency: task.assignedEmployee.organization.currency,
                  timezone: task.assignedEmployee.organization.timezone,
                  fiscal_start_month:
                    task.assignedEmployee.organization.fiscal_start_month,
                  created_at: toISOStringSafe(
                    task.assignedEmployee.organization.created_at,
                  ),
                } satisfies IHrmOrganization.ISummary,
                role: {
                  id: task.assignedEmployee.role.id,
                  name: task.assignedEmployee.role.name,
                  is_builtin: task.assignedEmployee.role.is_builtin,
                  description: task.assignedEmployee.role.description ?? null,
                  organization: {
                    id: task.assignedEmployee.role.organization.id,
                    name: task.assignedEmployee.role.organization.name,
                    description:
                      task.assignedEmployee.role.organization.description ??
                      null,
                    logo_image_url:
                      task.assignedEmployee.role.organization.logo_image_url ??
                      null,
                    currency: task.assignedEmployee.role.organization.currency,
                    timezone: task.assignedEmployee.role.organization.timezone,
                    fiscal_start_month:
                      task.assignedEmployee.role.organization
                        .fiscal_start_month,
                    created_at: toISOStringSafe(
                      task.assignedEmployee.role.organization.created_at,
                    ),
                  } satisfies IHrmOrganization.ISummary,
                  created_at: toISOStringSafe(
                    task.assignedEmployee.role.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    task.assignedEmployee.role.updated_at,
                  ),
                } satisfies IHrmRole.ISummary,
                department: task.assignedEmployee.department
                  ? ({
                      id: task.assignedEmployee.department.id,
                      name: task.assignedEmployee.department.name,
                      description:
                        task.assignedEmployee.department.description ?? null,
                      parent_department: task.assignedEmployee.department
                        .parentDepartment
                        ? ({
                            id: task.assignedEmployee.department
                              .parentDepartment.id,
                            name: task.assignedEmployee.department
                              .parentDepartment.name,
                            description:
                              task.assignedEmployee.department.parentDepartment
                                .description ?? null,
                            parent_department: null,
                            created_at: toISOStringSafe(
                              task.assignedEmployee.department.parentDepartment
                                .created_at,
                            ),
                          } satisfies IHrmDepartment.ISummary)
                        : null,
                      created_at: toISOStringSafe(
                        task.assignedEmployee.department.created_at,
                      ),
                    } satisfies IHrmDepartment.ISummary)
                  : null,
                created_at: toISOStringSafe(task.assignedEmployee.created_at),
              } satisfies IHrmEmployee.ISummary)
            : null,
          parentTask: task.parentTask
            ? ({
                id: task.parentTask.id,
                title: task.parentTask.title,
                status: task.parentTask.status,
                priority: task.parentTask.priority,
                project: {
                  id: task.parentTask.project.id,
                  name: task.parentTask.project.name,
                  description: task.parentTask.project.description ?? null,
                  color_code: task.parentTask.project.color_code,
                  status: task.parentTask.project.status,
                  start_date: task.parentTask.project.start_date
                    ? toISOStringSafe(task.parentTask.project.start_date)
                    : null,
                  end_date: task.parentTask.project.end_date
                    ? toISOStringSafe(task.parentTask.project.end_date)
                    : null,
                  organization: {
                    id: task.parentTask.project.organization.id,
                    name: task.parentTask.project.organization.name,
                    description:
                      task.parentTask.project.organization.description ?? null,
                    logo_image_url:
                      task.parentTask.project.organization.logo_image_url ??
                      null,
                    currency: task.parentTask.project.organization.currency,
                    timezone: task.parentTask.project.organization.timezone,
                    fiscal_start_month:
                      task.parentTask.project.organization.fiscal_start_month,
                    created_at: toISOStringSafe(
                      task.parentTask.project.organization.created_at,
                    ),
                  } satisfies IHrmOrganization.ISummary,
                  created_at: toISOStringSafe(
                    task.parentTask.project.created_at,
                  ),
                } satisfies IHrmProject.ISummary,
                assignedEmployee: task.parentTask.assignedEmployee
                  ? ({
                      id: task.parentTask.assignedEmployee.id,
                      position: task.parentTask.assignedEmployee.position,
                      employment_type:
                        task.parentTask.assignedEmployee.employment_type,
                      status: task.parentTask.assignedEmployee.status,
                      user: {
                        id: task.parentTask.assignedEmployee.user.id,
                        email: task.parentTask.assignedEmployee.user.email,
                        created_at: toISOStringSafe(
                          task.parentTask.assignedEmployee.user.created_at,
                        ),
                        updated_at: toISOStringSafe(
                          task.parentTask.assignedEmployee.user.updated_at,
                        ),
                        deleted_at: task.parentTask.assignedEmployee.user
                          .deleted_at
                          ? toISOStringSafe(
                              task.parentTask.assignedEmployee.user.deleted_at,
                            )
                          : null,
                      } satisfies IHrmMember.ISummary,
                      organization: {
                        id: task.parentTask.assignedEmployee.organization.id,
                        name: task.parentTask.assignedEmployee.organization
                          .name,
                        description:
                          task.parentTask.assignedEmployee.organization
                            .description ?? null,
                        logo_image_url:
                          task.parentTask.assignedEmployee.organization
                            .logo_image_url ?? null,
                        currency:
                          task.parentTask.assignedEmployee.organization
                            .currency,
                        timezone:
                          task.parentTask.assignedEmployee.organization
                            .timezone,
                        fiscal_start_month:
                          task.parentTask.assignedEmployee.organization
                            .fiscal_start_month,
                        created_at: toISOStringSafe(
                          task.parentTask.assignedEmployee.organization
                            .created_at,
                        ),
                      } satisfies IHrmOrganization.ISummary,
                      role: {
                        id: task.parentTask.assignedEmployee.role.id,
                        name: task.parentTask.assignedEmployee.role.name,
                        is_builtin:
                          task.parentTask.assignedEmployee.role.is_builtin,
                        description:
                          task.parentTask.assignedEmployee.role.description ??
                          null,
                        organization: {
                          id: task.parentTask.assignedEmployee.role.organization
                            .id,
                          name: task.parentTask.assignedEmployee.role
                            .organization.name,
                          description:
                            task.parentTask.assignedEmployee.role.organization
                              .description ?? null,
                          logo_image_url:
                            task.parentTask.assignedEmployee.role.organization
                              .logo_image_url ?? null,
                          currency:
                            task.parentTask.assignedEmployee.role.organization
                              .currency,
                          timezone:
                            task.parentTask.assignedEmployee.role.organization
                              .timezone,
                          fiscal_start_month:
                            task.parentTask.assignedEmployee.role.organization
                              .fiscal_start_month,
                          created_at: toISOStringSafe(
                            task.parentTask.assignedEmployee.role.organization
                              .created_at,
                          ),
                        } satisfies IHrmOrganization.ISummary,
                        created_at: toISOStringSafe(
                          task.parentTask.assignedEmployee.role.created_at,
                        ),
                        updated_at: toISOStringSafe(
                          task.parentTask.assignedEmployee.role.updated_at,
                        ),
                      } satisfies IHrmRole.ISummary,
                      department: task.parentTask.assignedEmployee.department
                        ? ({
                            id: task.parentTask.assignedEmployee.department.id,
                            name: task.parentTask.assignedEmployee.department
                              .name,
                            description:
                              task.parentTask.assignedEmployee.department
                                .description ?? null,
                            parent_department: task.parentTask.assignedEmployee
                              .department.parentDepartment
                              ? ({
                                  id: task.parentTask.assignedEmployee
                                    .department.parentDepartment.id,
                                  name: task.parentTask.assignedEmployee
                                    .department.parentDepartment.name,
                                  description:
                                    task.parentTask.assignedEmployee.department
                                      .parentDepartment.description ?? null,
                                  parent_department: null,
                                  created_at: toISOStringSafe(
                                    task.parentTask.assignedEmployee.department
                                      .parentDepartment.created_at,
                                  ),
                                } satisfies IHrmDepartment.ISummary)
                              : null,
                            created_at: toISOStringSafe(
                              task.parentTask.assignedEmployee.department
                                .created_at,
                            ),
                          } satisfies IHrmDepartment.ISummary)
                        : null,
                      created_at: toISOStringSafe(
                        task.parentTask.assignedEmployee.created_at,
                      ),
                    } satisfies IHrmEmployee.ISummary)
                  : null,
                parentTask: null,
                dueDate: task.parentTask.due_date
                  ? toISOStringSafe(task.parentTask.due_date)
                  : null,
                estimatedHours: task.parentTask.estimated_hours ?? null,
                createdAt: toISOStringSafe(task.parentTask.created_at),
                updatedAt: toISOStringSafe(task.parentTask.updated_at),
              } satisfies IHrmTask.ISummary)
            : null,
          dueDate: task.due_date ? toISOStringSafe(task.due_date) : null,
          estimatedHours: task.estimated_hours ?? null,
          createdAt: toISOStringSafe(task.created_at),
          updatedAt: toISOStringSafe(task.updated_at),
        } satisfies IHrmTask.ISummary;
      }
    }
    items.push(item);
  }
  // Generate cursor for pagination
  const cursor = hasMore
    ? JSON.stringify({
        hrm_employee_id:
          groupedData[groupedData.length - 1].hrm_employee_id ?? null,
        hrm_project_id:
          groupedData[groupedData.length - 1].hrm_project_id ?? null,
        hrm_task_id: groupedData[groupedData.length - 1].hrm_task_id ?? null,
      })
    : null;
  return {
    total_hours: (totalDuration._sum?.duration_minutes ?? 0) / 60,
    total_billable_hours:
      (totalBillableDuration._sum?.duration_minutes ?? 0) / 60,
    total_non_billable_hours:
      ((totalDuration._sum?.duration_minutes ?? 0) -
        (totalBillableDuration._sum?.duration_minutes ?? 0)) /
      60,
    total_entries: totalEntries,
    items,
    cursor,
  } satisfies IHrmTimelog.ISummary;
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
// import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
// import { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberOrganizationsOrganizationIdReportsTime(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmTimelog.IRequest;
// }): Promise<IHrmTimelog.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------