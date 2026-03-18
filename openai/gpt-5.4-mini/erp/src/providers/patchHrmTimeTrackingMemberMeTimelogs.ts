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

export async function patchHrmTimeTrackingMemberMeTimelogs(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingTimelog.IRequest;
}): Promise<IPageIHrmTimeTrackingTimelog.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const member =
    await MyGlobal.prisma.hrm_time_tracking_members.findFirstOrThrow({
      where: {
        id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  void member;
  const whereInput = {
    deleted_at: null,
    ...(props.body.project_id !== undefined
      ? { project_id: props.body.project_id }
      : {}),
    ...(props.body.task_id !== undefined
      ? { task_id: props.body.task_id }
      : {}),
    ...(props.body.billable !== undefined
      ? { billable: props.body.billable }
      : {}),
    ...(props.body.work_date_from !== undefined ||
    props.body.work_date_to !== undefined
      ? {
          work_date: {
            ...(props.body.work_date_from !== undefined
              ? { gte: props.body.work_date_from }
              : {}),
            ...(props.body.work_date_to !== undefined
              ? { lte: props.body.work_date_to }
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
  } satisfies Prisma.hrm_time_tracking_timelogsWhereInput;
  if (props.body.project_id !== undefined && props.body.task_id !== undefined) {
    const task = await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow(
      {
        where: {
          id: props.body.task_id,
          deleted_at: null,
          project_id: props.body.project_id,
        },
        select: {
          id: true,
        },
      },
    );
    void task;
  }
  const data = await MyGlobal.prisma.hrm_time_tracking_timelogs.findMany({
    where: whereInput,
    skip: skip,
    take: limit,
    orderBy: [{ work_date: "desc" }, { created_at: "desc" }],
    select: {
      id: true,
      work_date: true,
      duration_minutes: true,
      description: true,
      billable: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
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
          user_account: { select: {} },
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
    },
  });
  const records = await MyGlobal.prisma.hrm_time_tracking_timelogs.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(data, async (item) => ({
      id: item.id,
      employee: {
        id: item.employee.id,
        organization: {
          id: item.employee.organization.id,
          name: item.employee.organization.name,
          description: item.employee.organization.description,
          logoImageUrl: item.employee.organization.logo_image_url,
          currency: item.employee.organization.currency,
          timezone: item.employee.organization.timezone,
          fiscalStartMonth: item.employee.organization.fiscal_start_month,
          createdAt: item.employee.organization.created_at.toISOString(),
          updatedAt: item.employee.organization.updated_at.toISOString(),
          deletedAt:
            item.employee.organization.deleted_at === null
              ? null
              : item.employee.organization.deleted_at.toISOString(),
        },
        userAccount: {},
        role: {
          id: item.employee.role.id,
          organization: {
            id: item.employee.role.organization.id,
            name: item.employee.role.organization.name,
            description: item.employee.role.organization.description,
            logoImageUrl: item.employee.role.organization.logo_image_url,
            currency: item.employee.role.organization.currency,
            timezone: item.employee.role.organization.timezone,
            fiscalStartMonth:
              item.employee.role.organization.fiscal_start_month,
            createdAt: item.employee.role.organization.created_at.toISOString(),
            updatedAt: item.employee.role.organization.updated_at.toISOString(),
            deletedAt:
              item.employee.role.organization.deleted_at === null
                ? null
                : item.employee.role.organization.deleted_at.toISOString(),
          },
          name: item.employee.role.name,
          code: item.employee.role.code,
          description: item.employee.role.description,
          isBuiltin: item.employee.role.is_builtin,
          sortOrder: item.employee.role.sort_order,
          createdAt: item.employee.role.created_at.toISOString(),
          updatedAt: item.employee.role.updated_at.toISOString(),
          deletedAt:
            item.employee.role.deleted_at === null
              ? null
              : item.employee.role.deleted_at.toISOString(),
        },
        department:
          item.employee.department === null
            ? null
            : {
                id: item.employee.department.id,
                name: item.employee.department.name,
                description: item.employee.department.description,
                parentDepartmentId:
                  item.employee.department.parent_department_id,
                created_at: item.employee.department.created_at.toISOString(),
                updated_at: item.employee.department.updated_at.toISOString(),
              },
        positionTitle: item.employee.position_title,
        employmentType: item.employee.employment_type,
        status: item.employee.status,
        createdAt: item.employee.created_at.toISOString(),
        updatedAt: item.employee.updated_at.toISOString(),
        deletedAt:
          item.employee.deleted_at === null
            ? null
            : item.employee.deleted_at.toISOString(),
      },
      project: {
        id: item.project.id,
        organization: {
          id: item.project.organization.id,
          name: item.project.organization.name,
          description: item.project.organization.description,
          logoImageUrl: item.project.organization.logo_image_url,
          currency: item.project.organization.currency,
          timezone: item.project.organization.timezone,
          fiscalStartMonth: item.project.organization.fiscal_start_month,
          createdAt: item.project.organization.created_at.toISOString(),
          updatedAt: item.project.organization.updated_at.toISOString(),
          deletedAt:
            item.project.organization.deleted_at === null
              ? null
              : item.project.organization.deleted_at.toISOString(),
        },
        name: item.project.name,
        description: item.project.description,
        colorCode: item.project.color_code,
        status: item.project.status,
        budgetHours: item.project.budget_hours,
        startDate:
          item.project.start_date === null
            ? null
            : item.project.start_date.toISOString(),
        endDate:
          item.project.end_date === null
            ? null
            : item.project.end_date.toISOString(),
        createdAt: item.project.created_at.toISOString(),
        updatedAt: item.project.updated_at.toISOString(),
        deletedAt:
          item.project.deleted_at === null
            ? null
            : item.project.deleted_at.toISOString(),
      },
      task:
        item.task === null
          ? null
          : {
              id: item.task.id,
              project: {
                id: item.task.project.id,
                organization: {
                  id: item.task.project.organization.id,
                  name: item.task.project.organization.name,
                  description: item.task.project.organization.description,
                  logoImageUrl: item.task.project.organization.logo_image_url,
                  currency: item.task.project.organization.currency,
                  timezone: item.task.project.organization.timezone,
                  fiscalStartMonth:
                    item.task.project.organization.fiscal_start_month,
                  createdAt:
                    item.task.project.organization.created_at.toISOString(),
                  updatedAt:
                    item.task.project.organization.updated_at.toISOString(),
                  deletedAt:
                    item.task.project.organization.deleted_at === null
                      ? null
                      : item.task.project.organization.deleted_at.toISOString(),
                },
                name: item.task.project.name,
                description: item.task.project.description,
                colorCode: item.task.project.color_code,
                status: item.task.project.status,
                budgetHours: item.task.project.budget_hours,
                startDate:
                  item.task.project.start_date === null
                    ? null
                    : item.task.project.start_date.toISOString(),
                endDate:
                  item.task.project.end_date === null
                    ? null
                    : item.task.project.end_date.toISOString(),
                createdAt: item.task.project.created_at.toISOString(),
                updatedAt: item.task.project.updated_at.toISOString(),
                deletedAt:
                  item.task.project.deleted_at === null
                    ? null
                    : item.task.project.deleted_at.toISOString(),
              },
              assignee: null,
              parent: null,
              title: item.task.title,
              description: item.task.description,
              status: item.task.status,
              priority: item.task.priority,
              estimated_hours: item.task.estimated_hours,
              due_date:
                item.task.due_date === null
                  ? null
                  : item.task.due_date.toISOString(),
              created_at: item.task.created_at.toISOString(),
              updated_at: item.task.updated_at.toISOString(),
              deleted_at:
                item.task.deleted_at === null
                  ? null
                  : item.task.deleted_at.toISOString(),
            },
      work_date: item.work_date.toISOString(),
      duration_minutes: item.duration_minutes,
      description: item.description,
      billable: item.billable,
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
      deleted_at:
        item.deleted_at === null ? null : item.deleted_at.toISOString(),
    })),
  };
}
