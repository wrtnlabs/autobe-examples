import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelog";
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

export async function patchHrmTimeTrackingMemberTimelogsOrganizationView(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingTimelog.IRequest;
}): Promise<IPageIHrmTimeTrackingTimelog.ISummary> {
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        user_account_id: props.member.id,
        deleted_at: null,
        organization: {
          deleted_at: null,
        },
      },
      select: {
        organization_id: true,
      },
    });
  const where: Prisma.hrm_time_tracking_timelogsWhereInput = {
    organization_id: employee.organization_id,
    deleted_at: null,
    ...(props.body.employee_id !== undefined && {
      employee_id: props.body.employee_id,
    }),
    ...(props.body.project_id !== undefined && {
      project_id: props.body.project_id,
    }),
    ...(props.body.task_id !== undefined && { task_id: props.body.task_id }),
    ...(props.body.billable !== undefined && { billable: props.body.billable }),
    ...(props.body.work_date_from !== undefined ||
    props.body.work_date_to !== undefined
      ? {
          work_date: {
            ...(props.body.work_date_from !== undefined
              ? { gte: new globalThis.Date(props.body.work_date_from) }
              : {}),
            ...(props.body.work_date_to !== undefined
              ? { lte: new globalThis.Date(props.body.work_date_to) }
              : {}),
          },
        }
      : {}),
    ...(props.body.search !== undefined
      ? {
          description: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
  };
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const orderBy: Prisma.hrm_time_tracking_timelogsOrderByWithRelationInput[] =
    props.body.sort === "work_date_asc"
      ? [{ work_date: "asc" }, { created_at: "asc" }]
      : props.body.sort === "created_at_asc"
        ? [{ created_at: "asc" }, { work_date: "asc" }]
        : props.body.sort === "created_at_desc"
          ? [{ created_at: "desc" }, { work_date: "desc" }]
          : [{ work_date: "desc" }, { created_at: "desc" }];
  const data = await MyGlobal.prisma.hrm_time_tracking_timelogs.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      employee: {
        select: {
          id: true,
          organization: {
            select: {
              id: true,
              name: true,
              description: true,
              logo_image_url: true,
              currency: true,
              timezone: true,
              fiscal_start_month: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          userAccount: {
            select: {},
          },
          role: {
            select: {
              id: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  logo_image_url: true,
                  currency: true,
                  timezone: true,
                  fiscal_start_month: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              name: true,
              code: true,
              description: true,
              is_builtin: true,
              sort_order: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              description: true,
              parent_department_id: true,
              created_at: true,
              updated_at: true,
            },
          },
          position_title: true,
          employment_type: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      project: {
        select: {
          id: true,
          organization: {
            select: {
              id: true,
              name: true,
              description: true,
              logo_image_url: true,
              currency: true,
              timezone: true,
              fiscal_start_month: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          name: true,
          description: true,
          color_code: true,
          status: true,
          budget_hours: true,
          start_date: true,
          end_date: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      task: {
        select: {
          id: true,
          project: {
            select: {
              id: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  logo_image_url: true,
                  currency: true,
                  timezone: true,
                  fiscal_start_month: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              name: true,
              description: true,
              color_code: true,
              status: true,
              budget_hours: true,
              start_date: true,
              end_date: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          assignee: {
            select: {
              id: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  logo_image_url: true,
                  currency: true,
                  timezone: true,
                  fiscal_start_month: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              userAccount: {
                select: {},
              },
              role: {
                select: {
                  id: true,
                  organization: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      logo_image_url: true,
                      currency: true,
                      timezone: true,
                      fiscal_start_month: true,
                      created_at: true,
                      updated_at: true,
                      deleted_at: true,
                    },
                  },
                  name: true,
                  code: true,
                  description: true,
                  is_builtin: true,
                  sort_order: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              department: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  parent_department_id: true,
                  created_at: true,
                  updated_at: true,
                },
              },
              position_title: true,
              employment_type: true,
              status: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          parent: {
            select: {
              id: true,
              project: {
                select: {
                  id: true,
                  organization: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      logo_image_url: true,
                      currency: true,
                      timezone: true,
                      fiscal_start_month: true,
                      created_at: true,
                      updated_at: true,
                      deleted_at: true,
                    },
                  },
                  name: true,
                  description: true,
                  color_code: true,
                  status: true,
                  budget_hours: true,
                  start_date: true,
                  end_date: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              assignee: null,
              parent: null,
              title: true,
              description: true,
              status: true,
              priority: true,
              estimated_hours: true,
              due_date: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          title: true,
          description: true,
          status: true,
          priority: true,
          estimated_hours: true,
          due_date: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      work_date: true,
      duration_minutes: true,
      description: true,
      billable: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const records = await MyGlobal.prisma.hrm_time_tracking_timelogs.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(data, async (record) => ({
      id: record.id,
      employee: {
        id: record.employee.id,
        organization: {
          id: record.employee.organization.id,
          name: record.employee.organization.name,
          description: record.employee.organization.description,
          logoImageUrl: record.employee.organization.logo_image_url,
          currency: record.employee.organization.currency,
          timezone: record.employee.organization.timezone,
          fiscalStartMonth: record.employee.organization.fiscal_start_month,
          createdAt: record.employee.organization.created_at.toISOString(),
          updatedAt: record.employee.organization.updated_at.toISOString(),
          deletedAt:
            record.employee.organization.deleted_at?.toISOString() ?? null,
        },
        userAccount: {},
        role: {
          id: record.employee.role.id,
          organization: {
            id: record.employee.role.organization.id,
            name: record.employee.role.organization.name,
            description: record.employee.role.organization.description,
            logoImageUrl: record.employee.role.organization.logo_image_url,
            currency: record.employee.role.organization.currency,
            timezone: record.employee.role.organization.timezone,
            fiscalStartMonth:
              record.employee.role.organization.fiscal_start_month,
            createdAt:
              record.employee.role.organization.created_at.toISOString(),
            updatedAt:
              record.employee.role.organization.updated_at.toISOString(),
            deletedAt:
              record.employee.role.organization.deleted_at?.toISOString() ??
              null,
          },
          name: record.employee.role.name,
          code: record.employee.role.code,
          description: record.employee.role.description,
          isBuiltin: record.employee.role.is_builtin,
          sortOrder: record.employee.role.sort_order,
          createdAt: record.employee.role.created_at.toISOString(),
          updatedAt: record.employee.role.updated_at.toISOString(),
          deletedAt: record.employee.role.deleted_at?.toISOString() ?? null,
        },
        department:
          record.employee.department === null
            ? null
            : {
                id: record.employee.department.id,
                name: record.employee.department.name,
                description: record.employee.department.description,
                parentDepartmentId:
                  record.employee.department.parent_department_id,
                created_at: record.employee.department.created_at.toISOString(),
                updated_at: record.employee.department.updated_at.toISOString(),
              },
        positionTitle: record.employee.position_title,
        employmentType: record.employee.employment_type,
        status: record.employee.status,
        createdAt: record.employee.created_at.toISOString(),
        updatedAt: record.employee.updated_at.toISOString(),
        deletedAt: record.employee.deleted_at?.toISOString() ?? null,
      },
      project: {
        id: record.project.id,
        organization: {
          id: record.project.organization.id,
          name: record.project.organization.name,
          description: record.project.organization.description,
          logoImageUrl: record.project.organization.logo_image_url,
          currency: record.project.organization.currency,
          timezone: record.project.organization.timezone,
          fiscalStartMonth: record.project.organization.fiscal_start_month,
          createdAt: record.project.organization.created_at.toISOString(),
          updatedAt: record.project.organization.updated_at.toISOString(),
          deletedAt:
            record.project.organization.deleted_at?.toISOString() ?? null,
        },
        name: record.project.name,
        description: record.project.description,
        colorCode: record.project.color_code,
        status: record.project.status,
        budgetHours: record.project.budget_hours,
        startDate: record.project.start_date?.toISOString() ?? null,
        endDate: record.project.end_date?.toISOString() ?? null,
        createdAt: record.project.created_at.toISOString(),
        updatedAt: record.project.updated_at.toISOString(),
        deletedAt: record.project.deleted_at?.toISOString() ?? null,
      },
      task:
        record.task === null
          ? null
          : {
              id: record.task.id,
              project: {
                id: record.task.project.id,
                organization: {
                  id: record.task.project.organization.id,
                  name: record.task.project.organization.name,
                  description: record.task.project.organization.description,
                  logoImageUrl: record.task.project.organization.logo_image_url,
                  currency: record.task.project.organization.currency,
                  timezone: record.task.project.organization.timezone,
                  fiscalStartMonth:
                    record.task.project.organization.fiscal_start_month,
                  createdAt:
                    record.task.project.organization.created_at.toISOString(),
                  updatedAt:
                    record.task.project.organization.updated_at.toISOString(),
                  deletedAt:
                    record.task.project.organization.deleted_at?.toISOString() ??
                    null,
                },
                name: record.task.project.name,
                description: record.task.project.description,
                colorCode: record.task.project.color_code,
                status: record.task.project.status,
                budgetHours: record.task.project.budget_hours,
                startDate:
                  record.task.project.start_date?.toISOString() ?? null,
                endDate: record.task.project.end_date?.toISOString() ?? null,
                createdAt: record.task.project.created_at.toISOString(),
                updatedAt: record.task.project.updated_at.toISOString(),
                deletedAt:
                  record.task.project.deleted_at?.toISOString() ?? null,
              },
              assignee:
                record.task.assignee === null
                  ? null
                  : {
                      id: record.task.assignee.id,
                      organization: {
                        id: record.task.assignee.organization.id,
                        name: record.task.assignee.organization.name,
                        description:
                          record.task.assignee.organization.description,
                        logoImageUrl:
                          record.task.assignee.organization.logo_image_url,
                        currency: record.task.assignee.organization.currency,
                        timezone: record.task.assignee.organization.timezone,
                        fiscalStartMonth:
                          record.task.assignee.organization.fiscal_start_month,
                        createdAt:
                          record.task.assignee.organization.created_at.toISOString(),
                        updatedAt:
                          record.task.assignee.organization.updated_at.toISOString(),
                        deletedAt:
                          record.task.assignee.organization.deleted_at?.toISOString() ??
                          null,
                      },
                      userAccount: {},
                      role: {
                        id: record.task.assignee.role.id,
                        organization: {
                          id: record.task.assignee.role.organization.id,
                          name: record.task.assignee.role.organization.name,
                          description:
                            record.task.assignee.role.organization.description,
                          logoImageUrl:
                            record.task.assignee.role.organization
                              .logo_image_url,
                          currency:
                            record.task.assignee.role.organization.currency,
                          timezone:
                            record.task.assignee.role.organization.timezone,
                          fiscalStartMonth:
                            record.task.assignee.role.organization
                              .fiscal_start_month,
                          createdAt:
                            record.task.assignee.role.organization.created_at.toISOString(),
                          updatedAt:
                            record.task.assignee.role.organization.updated_at.toISOString(),
                          deletedAt:
                            record.task.assignee.role.organization.deleted_at?.toISOString() ??
                            null,
                        },
                        name: record.task.assignee.role.name,
                        code: record.task.assignee.role.code,
                        description: record.task.assignee.role.description,
                        isBuiltin: record.task.assignee.role.is_builtin,
                        sortOrder: record.task.assignee.role.sort_order,
                        createdAt:
                          record.task.assignee.role.created_at.toISOString(),
                        updatedAt:
                          record.task.assignee.role.updated_at.toISOString(),
                        deletedAt:
                          record.task.assignee.role.deleted_at?.toISOString() ??
                          null,
                      },
                      department:
                        record.task.assignee.department === null
                          ? null
                          : {
                              id: record.task.assignee.department.id,
                              name: record.task.assignee.department.name,
                              description:
                                record.task.assignee.department.description,
                              parentDepartmentId:
                                record.task.assignee.department
                                  .parent_department_id,
                              created_at:
                                record.task.assignee.department.created_at.toISOString(),
                              updated_at:
                                record.task.assignee.department.updated_at.toISOString(),
                            },
                      positionTitle: record.task.assignee.position_title,
                      employmentType: record.task.assignee.employment_type,
                      status: record.task.assignee.status,
                      createdAt: record.task.assignee.created_at.toISOString(),
                      updatedAt: record.task.assignee.updated_at.toISOString(),
                      deletedAt:
                        record.task.assignee.deleted_at?.toISOString() ?? null,
                    },
              parent:
                record.task.parent === null
                  ? null
                  : {
                      id: record.task.parent.id,
                      project: {
                        id: record.task.parent.project.id,
                        organization: {
                          id: record.task.parent.project.organization.id,
                          name: record.task.parent.project.organization.name,
                          description:
                            record.task.parent.project.organization.description,
                          logoImageUrl:
                            record.task.parent.project.organization
                              .logo_image_url,
                          currency:
                            record.task.parent.project.organization.currency,
                          timezone:
                            record.task.parent.project.organization.timezone,
                          fiscalStartMonth:
                            record.task.parent.project.organization
                              .fiscal_start_month,
                          createdAt:
                            record.task.parent.project.organization.created_at.toISOString(),
                          updatedAt:
                            record.task.parent.project.organization.updated_at.toISOString(),
                          deletedAt:
                            record.task.parent.project.organization.deleted_at?.toISOString() ??
                            null,
                        },
                        name: record.task.parent.project.name,
                        description: record.task.parent.project.description,
                        colorCode: record.task.parent.project.color_code,
                        status: record.task.parent.project.status,
                        budgetHours: record.task.parent.project.budget_hours,
                        startDate:
                          record.task.parent.project.start_date?.toISOString() ??
                          null,
                        endDate:
                          record.task.parent.project.end_date?.toISOString() ??
                          null,
                        createdAt:
                          record.task.parent.project.created_at.toISOString(),
                        updatedAt:
                          record.task.parent.project.updated_at.toISOString(),
                        deletedAt:
                          record.task.parent.project.deleted_at?.toISOString() ??
                          null,
                      },
                      assignee: null,
                      parent: null,
                      title: record.task.parent.title,
                      description: record.task.parent.description,
                      status: record.task.parent.status,
                      priority: record.task.parent.priority,
                      estimated_hours: record.task.parent.estimated_hours,
                      due_date:
                        record.task.parent.due_date?.toISOString() ?? null,
                      created_at: record.task.parent.created_at.toISOString(),
                      updated_at: record.task.parent.updated_at.toISOString(),
                      deleted_at:
                        record.task.parent.deleted_at?.toISOString() ?? null,
                    },
              title: record.task.title,
              description: record.task.description,
              status: record.task.status,
              priority: record.task.priority,
              estimated_hours: record.task.estimated_hours,
              due_date: record.task.due_date?.toISOString() ?? null,
              created_at: record.task.created_at.toISOString(),
              updated_at: record.task.updated_at.toISOString(),
              deleted_at: record.task.deleted_at?.toISOString() ?? null,
            },
      work_date: record.work_date.toISOString(),
      duration_minutes: record.duration_minutes,
      description: record.description,
      billable: record.billable,
      created_at: record.created_at.toISOString(),
      updated_at: record.updated_at.toISOString(),
      deleted_at: record.deleted_at?.toISOString() ?? null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    },
  };
}
