import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimesheet";
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

export async function patchErpHrmMemberTimesheets(props: {
  member: MemberPayload;
  body: IErpHrmTimesheet.IRequest;
}): Promise<IPageIErpHrmTimesheet.ISummary> {
  // Step 1: Get the member's employee record to determine organization and permissions
  const memberEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      role: {
        select: {
          rolePermissions: {
            select: {
              permission: true,
            },
          },
        },
      },
    },
  });
  if (!memberEmployee) {
    throw new HttpException("Employee record not found", 404);
  }
  // Step 2: Check if member has time:approve permission
  const hasTimeApprovePermission = memberEmployee.role.rolePermissions.some(
    (p: { permission: string }) => p.permission === "time:approve",
  );
  // Step 3: Build where conditions
  const whereConditions: Prisma.erp_hrm_timesheetsWhereInput[] = [
    { deleted_at: null },
    {
      employee: {
        erp_hrm_organization_id: memberEmployee.erp_hrm_organization_id,
      },
    },
  ];
  // Authorization: Filter by own employee if no time:approve permission
  if (!hasTimeApprovePermission) {
    whereConditions.push({
      erp_hrm_employee_id: memberEmployee.id,
    });
  }
  // Apply status filter if provided
  if (props.body.status) {
    whereConditions.push({
      status: props.body.status,
    });
  }
  // Apply week start date range filters if provided
  if (props.body.weekStartDateFrom) {
    whereConditions.push({
      week_start_date: {
        gte: new Date(props.body.weekStartDateFrom),
      },
    });
  }
  if (props.body.weekStartDateTo) {
    whereConditions.push({
      week_start_date: {
        lte: new Date(props.body.weekStartDateTo),
      },
    });
  }
  // Apply employeeId filter only if member has time:approve permission
  if (props.body.employeeId && hasTimeApprovePermission) {
    whereConditions.push({
      erp_hrm_employee_id: props.body.employeeId,
    });
  }
  // Step 4: Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 5: Sorting
  const orderBy: Prisma.erp_hrm_timesheetsOrderByWithRelationInput =
    props.body.sort === "week_start_date"
      ? { week_start_date: "desc" }
      : { created_at: "desc" };
  // Step 6: Execute queries - fetch data and count separately
  const data = await MyGlobal.prisma.erp_hrm_timesheets.findMany({
    where: {
      AND: whereConditions,
    },
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      week_start_date: true,
      week_end_date: true,
      status: true,
      total_hours: true,
      submitted_at: true,
      reviewed_at: true,
      employee: {
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
  });
  const total = await MyGlobal.prisma.erp_hrm_timesheets.count({
    where: {
      AND: whereConditions,
    },
  });
  // Step 7: Transform results to response DTO
  const transformedData: IErpHrmTimesheet.ISummary[] = await Promise.all(
    data.map(async (timesheet) => ({
      employee: {
        id: timesheet.employee.id,
        position: timesheet.employee.position ?? undefined,
        employment_type: timesheet.employee.employment_type,
        status: timesheet.employee.status,
        created_at: timesheet.employee.created_at.toISOString(),
        updated_at: timesheet.employee.updated_at.toISOString(),
        deleted_at: timesheet.employee.deleted_at?.toISOString() ?? null,
        member: {
          id: timesheet.employee.member.id,
          email: timesheet.employee.member.email,
          displayName: timesheet.employee.member.display_name,
          avatarUri: timesheet.employee.member.avatar_uri ?? null,
          phone: timesheet.employee.member.phone ?? null,
          createdAt: timesheet.employee.member.created_at.toISOString(),
        } satisfies IErpHrmMember.ISummary,
        role: {
          id: timesheet.employee.role.id,
          name: timesheet.employee.role.name,
          is_builtin: timesheet.employee.role.is_builtin,
          created_at: timesheet.employee.role.created_at.toISOString(),
          organization: {
            id: timesheet.employee.role.organization.id,
            name: timesheet.employee.role.organization.name,
            description:
              timesheet.employee.role.organization.description ?? null,
            logoUri: timesheet.employee.role.organization.logo_uri ?? null,
            currency: timesheet.employee.role.organization.currency,
            timezone: timesheet.employee.role.organization.timezone,
            fiscalStartMonth:
              timesheet.employee.role.organization.fiscal_start_month,
            createdAt:
              timesheet.employee.role.organization.created_at.toISOString(),
            owner: {
              id: timesheet.employee.role.organization.owner.id,
              email: timesheet.employee.role.organization.owner.email,
              displayName:
                timesheet.employee.role.organization.owner.display_name,
              avatarUri:
                timesheet.employee.role.organization.owner.avatar_uri ?? null,
              phone: timesheet.employee.role.organization.owner.phone ?? null,
              createdAt:
                timesheet.employee.role.organization.owner.created_at.toISOString(),
            } satisfies IErpHrmMember.ISummary,
          } satisfies IErpHrmOrganization.ISummary,
        } satisfies IErpHrmRole.ISummary,
        department: timesheet.employee.department
          ? ({
              id: timesheet.employee.department.id,
              name: timesheet.employee.department.name,
              description: timesheet.employee.department.description ?? null,
              created_at:
                timesheet.employee.department.created_at.toISOString(),
              updated_at:
                timesheet.employee.department.updated_at.toISOString(),
              parent: timesheet.employee.department.parent
                ? {
                    id: timesheet.employee.department.parent.id,
                    name: timesheet.employee.department.parent.name,
                    description:
                      timesheet.employee.department.parent.description ?? null,
                    created_at:
                      timesheet.employee.department.parent.created_at.toISOString(),
                    updated_at:
                      timesheet.employee.department.parent.updated_at.toISOString(),
                  }
                : null,
            } satisfies IErpHrmDepartment.ISummary)
          : null,
      } satisfies IErpHrmEmployee.ISummary,
      id: timesheet.id,
      reviewedAt: timesheet.reviewed_at?.toISOString() ?? null,
      status: timesheet.status,
      submittedAt: timesheet.submitted_at?.toISOString() ?? null,
      totalHours: timesheet.total_hours,
      weekEndDate: timesheet.week_end_date.toISOString(),
      weekStartDate: timesheet.week_start_date.toISOString(),
    })),
  );
  // Step 8: Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
