import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheet";
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

export async function patchHrmPlatformMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmPlatformTimesheet.IRequest;
}): Promise<IPageIHrmPlatformTimesheet.ISummary> {
  // Find the employee record for this member in the current organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      hrm_platform_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  // Check if member has time:approve permission via role_permissions
  // Use correct relation name 'permission' not 'hrm_platform_permissions'
  const permission = await MyGlobal.prisma.hrm_platform_permissions.findFirst({
    where: {
      code: "time:approve",
      deleted_at: null,
    },
  });
  const hasTimeApprovePermission =
    permission &&
    (await MyGlobal.prisma.hrm_platform_role_permissions.count({
      where: {
        hrm_platform_role_id: employee.hrm_platform_role_id,
        hrm_platform_permission_id: permission.id,
      },
    })) > 0;
  // Build where clause
  const whereInput: Prisma.hrm_platform_timesheetsWhereInput = {
    deleted_at: null,
    ...(hasTimeApprovePermission
      ? {}
      : { hrm_platform_employee_id: employee.id }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.week_start_date && {
      week_start_date: {
        ...(props.body.week_start_date.gte && {
          gte: new Date(props.body.week_start_date.gte),
        }),
        ...(props.body.week_start_date.lte && {
          lte: new Date(props.body.week_start_date.lte),
        }),
      },
    }),
    ...(props.body.week_end_date && {
      week_end_date: {
        ...(props.body.week_end_date.gte && {
          gte: new Date(props.body.week_end_date.gte),
        }),
        ...(props.body.week_end_date.lte && {
          lte: new Date(props.body.week_end_date.lte),
        }),
      },
    }),
  };
  // Determine sorting
  const sortBy = props.body.sort_by ?? "week_start_date";
  const order = props.body.order ?? "desc";
  const orderByInput: Prisma.hrm_platform_timesheetsOrderByWithRelationInput =
    sortBy === "week_end_date"
      ? { week_end_date: order }
      : sortBy === "status"
        ? { status: order }
        : sortBy === "submitted_at"
          ? { submitted_at: order }
          : { week_start_date: order };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Fetch timesheets with correct select (no timesheetTimelogs - doesn't exist on model)
  const timesheets = await MyGlobal.prisma.hrm_platform_timesheets.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      week_start_date: true,
      week_end_date: true,
      status: true,
      submitted_at: true,
      reviewed_at: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
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
              display_name: true,
              avatar_image: true,
              phone_number: true,
            },
          },
          role: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              is_builtin: true,
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
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          } satisfies Prisma.hrm_platform_departmentsFindManyArgs,
        },
      },
      reviewer: {
        select: {
          id: true,
          email: true,
          display_name: true,
          avatar_image: true,
          phone_number: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.hrm_platform_timesheets.count({
    where: whereInput,
  });
  // Calculate total hours for each timesheet via junction table
  const timesheetIds = timesheets.map((t) => t.id);
  const timelogData =
    await MyGlobal.prisma.hrm_platform_timesheet_timelogs.findMany({
      where: {
        hrm_platform_timesheet_id: {
          in: timesheetIds,
        },
      },
      select: {
        hrm_platform_timesheet_id: true,
        timelog: {
          select: {
            duration_minutes: true,
          },
        },
      },
    });
  // Group by timesheet id and sum duration_minutes
  const totalHoursMap = new Map<string, number>();
  for (const tl of timelogData) {
    const current = totalHoursMap.get(tl.hrm_platform_timesheet_id) ?? 0;
    totalHoursMap.set(
      tl.hrm_platform_timesheet_id,
      current + tl.timelog.duration_minutes,
    );
  }
  // Transform results manually (since transformer expects timesheetTimelogs which doesn't exist)
  const data = await ArrayUtil.asyncMap(timesheets, async (timesheet) => {
    const totalMinutes = totalHoursMap.get(timesheet.id) ?? 0;
    return {
      id: timesheet.id,
      weekStartDate: toISOStringSafe(timesheet.week_start_date),
      weekEndDate: toISOStringSafe(timesheet.week_end_date),
      status: timesheet.status,
      totalHours: totalMinutes / 60.0,
      submittedAt: timesheet.submitted_at
        ? toISOStringSafe(timesheet.submitted_at)
        : null,
      reviewedAt: timesheet.reviewed_at
        ? toISOStringSafe(timesheet.reviewed_at)
        : null,
      employee: {
        id: timesheet.employee.id,
        position: timesheet.employee.position,
        employment_type: timesheet.employee.employment_type,
        status: timesheet.employee.status,
        user: {
          id: timesheet.employee.user.id,
          email: timesheet.employee.user.email,
          display_name: timesheet.employee.user.display_name,
          avatar_image: timesheet.employee.user.avatar_image,
          phone_number: timesheet.employee.user.phone_number,
        },
        role: {
          id: timesheet.employee.role.id,
          code: timesheet.employee.role.code,
          name: timesheet.employee.role.name,
          description: timesheet.employee.role.description,
          is_builtin: timesheet.employee.role.is_builtin,
          permissions: [],
          created_at: toISOStringSafe(timesheet.employee.role.created_at),
          deleted_at: timesheet.employee.role.deleted_at
            ? toISOStringSafe(timesheet.employee.role.deleted_at)
            : null,
        },
        department: timesheet.employee.department
          ? {
              id: timesheet.employee.department.id,
              name: timesheet.employee.department.name,
              description: timesheet.employee.department.description,
              parent_department: null,
              created_at: toISOStringSafe(
                timesheet.employee.department.created_at,
              ),
              updated_at: toISOStringSafe(
                timesheet.employee.department.updated_at,
              ),
              deleted_at: timesheet.employee.department.deleted_at
                ? toISOStringSafe(timesheet.employee.department.deleted_at)
                : null,
            }
          : null,
        created_at: toISOStringSafe(timesheet.employee.created_at),
      },
      reviewer: timesheet.reviewer
        ? {
            id: timesheet.reviewer.id,
            email: timesheet.reviewer.email,
            display_name: timesheet.reviewer.display_name,
            avatar_image: timesheet.reviewer.avatar_image,
            phone_number: timesheet.reviewer.phone_number,
          }
        : null,
    } satisfies IHrmPlatformTimesheet.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIHrmPlatformTimesheet.ISummary;
}
