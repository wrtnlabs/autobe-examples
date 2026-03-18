import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimesheet";
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

export async function patchHrmTimeTrackingMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingTimesheet.IRequest;
}): Promise<IPageIHrmTimeTrackingTimesheet.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: { user_account_id: props.member.id },
      select: {
        id: true,
        organization_id: true,
      },
    });
  const where: Prisma.hrm_time_tracking_timesheetsWhereInput = {
    organization_id: employee.organization_id,
    deleted_at: null,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.weekStart !== undefined && props.body.weekStart !== null
      ? { week_start: { gte: props.body.weekStart } }
      : {}),
    ...(props.body.weekEnd !== undefined && props.body.weekEnd !== null
      ? { week_end: { lte: props.body.weekEnd } }
      : {}),
    ...(props.body.search !== undefined && props.body.search.trim().length > 0
      ? {
          OR: [
            { status: { contains: props.body.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const records = await MyGlobal.prisma.hrm_time_tracking_timesheets.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ week_start: "desc" }, { created_at: "desc" }, { id: "desc" }],
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
      reviewedByEmployee: {
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
      week_start: true,
      week_end: true,
      status: true,
      submitted_at: true,
      reviewed_at: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total: number =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.count({ where });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      organization: {
        id: record.organization.id,
        name: record.organization.name,
        description: record.organization.description,
        logoImageUrl: record.organization.logo_image_url,
        currency: record.organization.currency,
        timezone: record.organization.timezone,
        fiscalStartMonth: record.organization.fiscal_start_month,
        createdAt: toISOStringSafe(record.organization.created_at),
        updatedAt: toISOStringSafe(record.organization.updated_at),
        deletedAt:
          record.organization.deleted_at === null
            ? null
            : toISOStringSafe(record.organization.deleted_at),
      },
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
          createdAt: toISOStringSafe(record.employee.organization.created_at),
          updatedAt: toISOStringSafe(record.employee.organization.updated_at),
          deletedAt:
            record.employee.organization.deleted_at === null
              ? null
              : toISOStringSafe(record.employee.organization.deleted_at),
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
            createdAt: toISOStringSafe(
              record.employee.role.organization.created_at,
            ),
            updatedAt: toISOStringSafe(
              record.employee.role.organization.updated_at,
            ),
            deletedAt:
              record.employee.role.organization.deleted_at === null
                ? null
                : toISOStringSafe(record.employee.role.organization.deleted_at),
          },
          name: record.employee.role.name,
          code: record.employee.role.code,
          description: record.employee.role.description,
          isBuiltin: record.employee.role.is_builtin,
          sortOrder: record.employee.role.sort_order,
          createdAt: toISOStringSafe(record.employee.role.created_at),
          updatedAt: toISOStringSafe(record.employee.role.updated_at),
          deletedAt:
            record.employee.role.deleted_at === null
              ? null
              : toISOStringSafe(record.employee.role.deleted_at),
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
                created_at: toISOStringSafe(
                  record.employee.department.created_at,
                ),
                updated_at: toISOStringSafe(
                  record.employee.department.updated_at,
                ),
              },
        positionTitle: record.employee.position_title,
        employmentType: record.employee.employment_type,
        status: record.employee.status,
        createdAt: toISOStringSafe(record.employee.created_at),
        updatedAt: toISOStringSafe(record.employee.updated_at),
        deletedAt:
          record.employee.deleted_at === null
            ? null
            : toISOStringSafe(record.employee.deleted_at),
      },
      reviewedByEmployee:
        record.reviewedByEmployee === null
          ? null
          : {
              id: record.reviewedByEmployee.id,
              organization: {
                id: record.reviewedByEmployee.organization.id,
                name: record.reviewedByEmployee.organization.name,
                description: record.reviewedByEmployee.organization.description,
                logoImageUrl:
                  record.reviewedByEmployee.organization.logo_image_url,
                currency: record.reviewedByEmployee.organization.currency,
                timezone: record.reviewedByEmployee.organization.timezone,
                fiscalStartMonth:
                  record.reviewedByEmployee.organization.fiscal_start_month,
                createdAt: toISOStringSafe(
                  record.reviewedByEmployee.organization.created_at,
                ),
                updatedAt: toISOStringSafe(
                  record.reviewedByEmployee.organization.updated_at,
                ),
                deletedAt:
                  record.reviewedByEmployee.organization.deleted_at === null
                    ? null
                    : toISOStringSafe(
                        record.reviewedByEmployee.organization.deleted_at,
                      ),
              },
              userAccount: {},
              role: {
                id: record.reviewedByEmployee.role.id,
                organization: {
                  id: record.reviewedByEmployee.role.organization.id,
                  name: record.reviewedByEmployee.role.organization.name,
                  description:
                    record.reviewedByEmployee.role.organization.description,
                  logoImageUrl:
                    record.reviewedByEmployee.role.organization.logo_image_url,
                  currency:
                    record.reviewedByEmployee.role.organization.currency,
                  timezone:
                    record.reviewedByEmployee.role.organization.timezone,
                  fiscalStartMonth:
                    record.reviewedByEmployee.role.organization
                      .fiscal_start_month,
                  createdAt: toISOStringSafe(
                    record.reviewedByEmployee.role.organization.created_at,
                  ),
                  updatedAt: toISOStringSafe(
                    record.reviewedByEmployee.role.organization.updated_at,
                  ),
                  deletedAt:
                    record.reviewedByEmployee.role.organization.deleted_at ===
                    null
                      ? null
                      : toISOStringSafe(
                          record.reviewedByEmployee.role.organization
                            .deleted_at,
                        ),
                },
                name: record.reviewedByEmployee.role.name,
                code: record.reviewedByEmployee.role.code,
                description: record.reviewedByEmployee.role.description,
                isBuiltin: record.reviewedByEmployee.role.is_builtin,
                sortOrder: record.reviewedByEmployee.role.sort_order,
                createdAt: toISOStringSafe(
                  record.reviewedByEmployee.role.created_at,
                ),
                updatedAt: toISOStringSafe(
                  record.reviewedByEmployee.role.updated_at,
                ),
                deletedAt:
                  record.reviewedByEmployee.role.deleted_at === null
                    ? null
                    : toISOStringSafe(
                        record.reviewedByEmployee.role.deleted_at,
                      ),
              },
              department:
                record.reviewedByEmployee.department === null
                  ? null
                  : {
                      id: record.reviewedByEmployee.department.id,
                      name: record.reviewedByEmployee.department.name,
                      description:
                        record.reviewedByEmployee.department.description,
                      parentDepartmentId:
                        record.reviewedByEmployee.department
                          .parent_department_id,
                      created_at: toISOStringSafe(
                        record.reviewedByEmployee.department.created_at,
                      ),
                      updated_at: toISOStringSafe(
                        record.reviewedByEmployee.department.updated_at,
                      ),
                    },
              positionTitle: record.reviewedByEmployee.position_title,
              employmentType: record.reviewedByEmployee.employment_type,
              status: record.reviewedByEmployee.status,
              createdAt: toISOStringSafe(record.reviewedByEmployee.created_at),
              updatedAt: toISOStringSafe(record.reviewedByEmployee.updated_at),
              deletedAt:
                record.reviewedByEmployee.deleted_at === null
                  ? null
                  : toISOStringSafe(record.reviewedByEmployee.deleted_at),
            },
      weekStart: toISOStringSafe(record.week_start),
      weekEnd: toISOStringSafe(record.week_end),
      status: record.status,
      submittedAt:
        record.submitted_at === null
          ? null
          : toISOStringSafe(record.submitted_at),
      reviewedAt:
        record.reviewed_at === null
          ? null
          : toISOStringSafe(record.reviewed_at),
      rejectionReason: record.rejection_reason,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    })),
  };
}
