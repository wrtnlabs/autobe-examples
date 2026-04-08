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
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimelog";
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

export async function patchHrmMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmTimelog.IRequest;
}): Promise<IPageIHrmTimelog.ISummary> {
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  const whereInput: Prisma.hrm_timelogsWhereInput = {
    deleted_at: null,
    hrm_employee_id: employee.id,
  };
  if (props.body.start_date !== undefined) {
    whereInput.date = {
      gte: props.body.start_date,
    };
  }
  if (props.body.end_date !== undefined) {
    if (whereInput.date) {
      (whereInput.date as Prisma.DateTimeFilter).lte = props.body.end_date;
    } else {
      whereInput.date = {
        lte: props.body.end_date,
      };
    }
  }
  if (props.body.billable !== undefined) {
    whereInput.billable = props.body.billable;
  }
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (page - 1) * limit;
  const timelogs = await MyGlobal.prisma.hrm_timelogs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { date: "desc" },
    select: {
      id: true,
      hrm_employee_id: true,
      hrm_project_id: true,
      hrm_task_id: true,
      date: true,
      duration_minutes: true,
      billable: true,
      employee: {
        select: {
          id: true,
          position: true,
          employment_type: true,
          status: true,
          created_at: true,
          user: {
            select: {
              id: true,
              email: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              description: true,
              currency: true,
              timezone: true,
              fiscal_start_month: true,
              logo_image_url: true,
              created_at: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              is_builtin: true,
              description: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  currency: true,
                  timezone: true,
                  fiscal_start_month: true,
                  logo_image_url: true,
                  created_at: true,
                },
              },
              created_at: true,
              updated_at: true,
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
                  created_at: true,
                },
              },
              created_at: true,
            },
          },
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          description: true,
          color_code: true,
          status: true,
          start_date: true,
          end_date: true,
          organization: {
            select: {
              id: true,
              name: true,
              description: true,
              currency: true,
              timezone: true,
              fiscal_start_month: true,
              logo_image_url: true,
              created_at: true,
            },
          },
          created_at: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          created_at: true,
          updated_at: true,
          project: {
            select: {
              id: true,
              name: true,
              description: true,
              color_code: true,
              status: true,
              start_date: true,
              end_date: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  currency: true,
                  timezone: true,
                  fiscal_start_month: true,
                  logo_image_url: true,
                  created_at: true,
                },
              },
              created_at: true,
            },
          },
          assignedEmployee: {
            select: {
              id: true,
              position: true,
              employment_type: true,
              status: true,
              created_at: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              organization: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  currency: true,
                  timezone: true,
                  fiscal_start_month: true,
                  logo_image_url: true,
                  created_at: true,
                },
              },
              role: {
                select: {
                  id: true,
                  name: true,
                  is_builtin: true,
                  description: true,
                  organization: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      currency: true,
                      timezone: true,
                      fiscal_start_month: true,
                      logo_image_url: true,
                      created_at: true,
                    },
                  },
                  created_at: true,
                  updated_at: true,
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
                      created_at: true,
                    },
                  },
                  created_at: true,
                },
              },
            },
          },
          parentTask: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              created_at: true,
              updated_at: true,
              project: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  color_code: true,
                  status: true,
                  start_date: true,
                  end_date: true,
                  organization: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      currency: true,
                      timezone: true,
                      fiscal_start_month: true,
                      logo_image_url: true,
                      created_at: true,
                    },
                  },
                  created_at: true,
                },
              },
              assignedEmployee: {
                select: {
                  id: true,
                  position: true,
                  employment_type: true,
                  status: true,
                  created_at: true,
                  user: {
                    select: {
                      id: true,
                      email: true,
                      created_at: true,
                      updated_at: true,
                      deleted_at: true,
                    },
                  },
                  organization: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      currency: true,
                      timezone: true,
                      fiscal_start_month: true,
                      logo_image_url: true,
                      created_at: true,
                    },
                  },
                  role: {
                    select: {
                      id: true,
                      name: true,
                      is_builtin: true,
                      description: true,
                      organization: {
                        select: {
                          id: true,
                          name: true,
                          description: true,
                          currency: true,
                          timezone: true,
                          fiscal_start_month: true,
                          logo_image_url: true,
                          created_at: true,
                        },
                      },
                      created_at: true,
                      updated_at: true,
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
                          created_at: true,
                        },
                      },
                      created_at: true,
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
  const total = await MyGlobal.prisma.hrm_timelogs.count({
    where: whereInput,
  });
  const totalHours =
    timelogs.reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
  const totalBillableHours =
    timelogs
      .filter((t) => t.billable)
      .reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
  const totalNonBillableHours =
    timelogs
      .filter((t) => !t.billable)
      .reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
  const items = await ArrayUtil.asyncMap(timelogs, async (timelog) => {
    const employeeSummary: IHrmEmployee.ISummary = {
      id: timelog.employee.id,
      position: timelog.employee.position,
      employment_type: timelog.employee.employment_type,
      status: timelog.employee.status,
      created_at: toISOStringSafe(timelog.employee.created_at),
      user: {
        id: timelog.employee.user.id,
        email: timelog.employee.user.email,
        created_at: toISOStringSafe(timelog.employee.user.created_at),
        updated_at: toISOStringSafe(timelog.employee.user.updated_at),
        deleted_at: timelog.employee.user.deleted_at
          ? toISOStringSafe(timelog.employee.user.deleted_at)
          : null,
      },
      organization: {
        id: timelog.employee.organization.id,
        name: timelog.employee.organization.name,
        description: timelog.employee.organization.description ?? null,
        currency: timelog.employee.organization.currency,
        timezone: timelog.employee.organization.timezone,
        fiscal_start_month: timelog.employee.organization.fiscal_start_month,
        logo_image_url: timelog.employee.organization.logo_image_url ?? null,
        created_at: toISOStringSafe(timelog.employee.organization.created_at),
      },
      role: {
        id: timelog.employee.role.id,
        name: timelog.employee.role.name,
        is_builtin: timelog.employee.role.is_builtin,
        description: timelog.employee.role.description ?? null,
        organization: {
          id: timelog.employee.role.organization.id,
          name: timelog.employee.role.organization.name,
          description: timelog.employee.role.organization.description ?? null,
          currency: timelog.employee.role.organization.currency,
          timezone: timelog.employee.role.organization.timezone,
          fiscal_start_month:
            timelog.employee.role.organization.fiscal_start_month,
          logo_image_url:
            timelog.employee.role.organization.logo_image_url ?? null,
          created_at: toISOStringSafe(
            timelog.employee.role.organization.created_at,
          ),
        },
        created_at: toISOStringSafe(timelog.employee.role.created_at),
        updated_at: toISOStringSafe(timelog.employee.role.updated_at),
      },
      department: timelog.employee.department
        ? {
            id: timelog.employee.department.id,
            name: timelog.employee.department.name,
            description: timelog.employee.department.description ?? null,
            parent_department: timelog.employee.department.parentDepartment
              ? {
                  id: timelog.employee.department.parentDepartment.id,
                  name: timelog.employee.department.parentDepartment.name,
                  created_at: toISOStringSafe(
                    timelog.employee.department.parentDepartment.created_at,
                  ),
                  parent_department: null,
                }
              : null,
            created_at: toISOStringSafe(timelog.employee.department.created_at),
          }
        : null,
    } satisfies IHrmEmployee.ISummary;
    const projectSummary: IHrmProject.ISummary = {
      id: timelog.project.id,
      name: timelog.project.name,
      description: timelog.project.description ?? null,
      color_code: timelog.project.color_code,
      status: timelog.project.status,
      start_date: timelog.project.start_date
        ? toISOStringSafe(timelog.project.start_date)
        : null,
      end_date: timelog.project.end_date
        ? toISOStringSafe(timelog.project.end_date)
        : null,
      organization: {
        id: timelog.project.organization.id,
        name: timelog.project.organization.name,
        description: timelog.project.organization.description ?? null,
        currency: timelog.project.organization.currency,
        timezone: timelog.project.organization.timezone,
        fiscal_start_month: timelog.project.organization.fiscal_start_month,
        logo_image_url: timelog.project.organization.logo_image_url ?? null,
        created_at: toISOStringSafe(timelog.project.organization.created_at),
      },
      created_at: toISOStringSafe(timelog.project.created_at),
    } satisfies IHrmProject.ISummary;
    const taskSummary: IHrmTask.ISummary | undefined = timelog.task
      ? {
          id: timelog.task.id,
          title: timelog.task.title,
          status: timelog.task.status,
          priority: timelog.task.priority,
          project: projectSummary,
          assignedEmployee: timelog.task.assignedEmployee
            ? {
                id: timelog.task.assignedEmployee.id,
                position: timelog.task.assignedEmployee.position,
                employment_type: timelog.task.assignedEmployee.employment_type,
                status: timelog.task.assignedEmployee.status,
                created_at: toISOStringSafe(
                  timelog.task.assignedEmployee.created_at,
                ),
                user: {
                  id: timelog.task.assignedEmployee.user.id,
                  email: timelog.task.assignedEmployee.user.email,
                  created_at: toISOStringSafe(
                    timelog.task.assignedEmployee.user.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    timelog.task.assignedEmployee.user.updated_at,
                  ),
                  deleted_at: timelog.task.assignedEmployee.user.deleted_at
                    ? toISOStringSafe(
                        timelog.task.assignedEmployee.user.deleted_at,
                      )
                    : null,
                },
                organization: {
                  id: timelog.task.assignedEmployee.organization.id,
                  name: timelog.task.assignedEmployee.organization.name,
                  description:
                    timelog.task.assignedEmployee.organization.description ??
                    null,
                  currency: timelog.task.assignedEmployee.organization.currency,
                  timezone: timelog.task.assignedEmployee.organization.timezone,
                  fiscal_start_month:
                    timelog.task.assignedEmployee.organization
                      .fiscal_start_month,
                  logo_image_url:
                    timelog.task.assignedEmployee.organization.logo_image_url ??
                    null,
                  created_at: toISOStringSafe(
                    timelog.task.assignedEmployee.organization.created_at,
                  ),
                },
                role: {
                  id: timelog.task.assignedEmployee.role.id,
                  name: timelog.task.assignedEmployee.role.name,
                  is_builtin: timelog.task.assignedEmployee.role.is_builtin,
                  description:
                    timelog.task.assignedEmployee.role.description ?? null,
                  organization: {
                    id: timelog.task.assignedEmployee.role.organization.id,
                    name: timelog.task.assignedEmployee.role.organization.name,
                    description:
                      timelog.task.assignedEmployee.role.organization
                        .description ?? null,
                    currency:
                      timelog.task.assignedEmployee.role.organization.currency,
                    timezone:
                      timelog.task.assignedEmployee.role.organization.timezone,
                    fiscal_start_month:
                      timelog.task.assignedEmployee.role.organization
                        .fiscal_start_month,
                    logo_image_url:
                      timelog.task.assignedEmployee.role.organization
                        .logo_image_url ?? null,
                    created_at: toISOStringSafe(
                      timelog.task.assignedEmployee.role.organization
                        .created_at,
                    ),
                  },
                  created_at: toISOStringSafe(
                    timelog.task.assignedEmployee.role.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    timelog.task.assignedEmployee.role.updated_at,
                  ),
                },
                department: timelog.task.assignedEmployee.department
                  ? {
                      id: timelog.task.assignedEmployee.department.id,
                      name: timelog.task.assignedEmployee.department.name,
                      description:
                        timelog.task.assignedEmployee.department.description ??
                        null,
                      parent_department: timelog.task.assignedEmployee
                        .department.parentDepartment
                        ? {
                            id: timelog.task.assignedEmployee.department
                              .parentDepartment.id,
                            name: timelog.task.assignedEmployee.department
                              .parentDepartment.name,
                            created_at: toISOStringSafe(
                              timelog.task.assignedEmployee.department
                                .parentDepartment.created_at,
                            ),
                            parent_department: null,
                          }
                        : null,
                      created_at: toISOStringSafe(
                        timelog.task.assignedEmployee.department.created_at,
                      ),
                    }
                  : null,
              }
            : null,
          parentTask: timelog.task.parentTask
            ? {
                id: timelog.task.parentTask.id,
                title: timelog.task.parentTask.title,
                status: timelog.task.parentTask.status,
                priority: timelog.task.parentTask.priority,
                project: projectSummary,
                assignedEmployee: timelog.task.parentTask.assignedEmployee
                  ? {
                      id: timelog.task.parentTask.assignedEmployee.id,
                      position:
                        timelog.task.parentTask.assignedEmployee.position,
                      employment_type:
                        timelog.task.parentTask.assignedEmployee
                          .employment_type,
                      status: timelog.task.parentTask.assignedEmployee.status,
                      created_at: toISOStringSafe(
                        timelog.task.parentTask.assignedEmployee.created_at,
                      ),
                      user: {
                        id: timelog.task.parentTask.assignedEmployee.user.id,
                        email:
                          timelog.task.parentTask.assignedEmployee.user.email,
                        created_at: toISOStringSafe(
                          timelog.task.parentTask.assignedEmployee.user
                            .created_at,
                        ),
                        updated_at: toISOStringSafe(
                          timelog.task.parentTask.assignedEmployee.user
                            .updated_at,
                        ),
                        deleted_at: timelog.task.parentTask.assignedEmployee
                          .user.deleted_at
                          ? toISOStringSafe(
                              timelog.task.parentTask.assignedEmployee.user
                                .deleted_at,
                            )
                          : null,
                      },
                      organization: {
                        id: timelog.task.parentTask.assignedEmployee
                          .organization.id,
                        name: timelog.task.parentTask.assignedEmployee
                          .organization.name,
                        description:
                          timelog.task.parentTask.assignedEmployee.organization
                            .description ?? null,
                        currency:
                          timelog.task.parentTask.assignedEmployee.organization
                            .currency,
                        timezone:
                          timelog.task.parentTask.assignedEmployee.organization
                            .timezone,
                        fiscal_start_month:
                          timelog.task.parentTask.assignedEmployee.organization
                            .fiscal_start_month,
                        logo_image_url:
                          timelog.task.parentTask.assignedEmployee.organization
                            .logo_image_url ?? null,
                        created_at: toISOStringSafe(
                          timelog.task.parentTask.assignedEmployee.organization
                            .created_at,
                        ),
                      },
                      role: {
                        id: timelog.task.parentTask.assignedEmployee.role.id,
                        name: timelog.task.parentTask.assignedEmployee.role
                          .name,
                        is_builtin:
                          timelog.task.parentTask.assignedEmployee.role
                            .is_builtin,
                        description:
                          timelog.task.parentTask.assignedEmployee.role
                            .description ?? null,
                        organization: {
                          id: timelog.task.parentTask.assignedEmployee.role
                            .organization.id,
                          name: timelog.task.parentTask.assignedEmployee.role
                            .organization.name,
                          description:
                            timelog.task.parentTask.assignedEmployee.role
                              .organization.description ?? null,
                          currency:
                            timelog.task.parentTask.assignedEmployee.role
                              .organization.currency,
                          timezone:
                            timelog.task.parentTask.assignedEmployee.role
                              .organization.timezone,
                          fiscal_start_month:
                            timelog.task.parentTask.assignedEmployee.role
                              .organization.fiscal_start_month,
                          logo_image_url:
                            timelog.task.parentTask.assignedEmployee.role
                              .organization.logo_image_url ?? null,
                          created_at: toISOStringSafe(
                            timelog.task.parentTask.assignedEmployee.role
                              .organization.created_at,
                          ),
                        },
                        created_at: toISOStringSafe(
                          timelog.task.parentTask.assignedEmployee.role
                            .created_at,
                        ),
                        updated_at: toISOStringSafe(
                          timelog.task.parentTask.assignedEmployee.role
                            .updated_at,
                        ),
                      },
                      department: timelog.task.parentTask.assignedEmployee
                        .department
                        ? {
                            id: timelog.task.parentTask.assignedEmployee
                              .department.id,
                            name: timelog.task.parentTask.assignedEmployee
                              .department.name,
                            description:
                              timelog.task.parentTask.assignedEmployee
                                .department.description ?? null,
                            parent_department: timelog.task.parentTask
                              .assignedEmployee.department.parentDepartment
                              ? {
                                  id: timelog.task.parentTask.assignedEmployee
                                    .department.parentDepartment.id,
                                  name: timelog.task.parentTask.assignedEmployee
                                    .department.parentDepartment.name,
                                  created_at: toISOStringSafe(
                                    timelog.task.parentTask.assignedEmployee
                                      .department.parentDepartment.created_at,
                                  ),
                                  parent_department: null,
                                }
                              : null,
                            created_at: toISOStringSafe(
                              timelog.task.parentTask.assignedEmployee
                                .department.created_at,
                            ),
                          }
                        : null,
                    }
                  : null,
                parentTask: null,
                createdAt: toISOStringSafe(timelog.task.parentTask.created_at),
                updatedAt: toISOStringSafe(timelog.task.parentTask.updated_at),
              }
            : null,
          createdAt: toISOStringSafe(timelog.task.created_at),
          updatedAt: toISOStringSafe(timelog.task.updated_at),
        }
      : undefined;
    return {
      total_hours: timelog.duration_minutes / 60,
      total_billable_hours: timelog.billable
        ? timelog.duration_minutes / 60
        : 0,
      total_non_billable_hours: !timelog.billable
        ? timelog.duration_minutes / 60
        : 0,
      total_entries: 1,
      employee: employeeSummary,
      project: projectSummary,
      task: taskSummary,
    } satisfies IHrmTimeReportItem;
  });
  const reportSummary: IHrmTimelog.ISummary = {
    total_hours: totalHours,
    total_billable_hours: totalBillableHours,
    total_non_billable_hours: totalNonBillableHours,
    total_entries: total,
    items: items,
    cursor: null,
  } satisfies IHrmTimelog.ISummary;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: [reportSummary],
  } satisfies IPageIHrmTimelog.ISummary;
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
// import { IPageIHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimelog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
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
// export async function patchHrmMemberTimelogs(props: {
//   member: MemberPayload;
//   body: IHrmTimelog.IRequest;
// }): Promise<IPageIHrmTimelog.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------