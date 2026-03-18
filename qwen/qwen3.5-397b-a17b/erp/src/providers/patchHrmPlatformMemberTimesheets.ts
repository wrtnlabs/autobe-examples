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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: {
      id: employee.role_id,
    },
    select: {
      id: true,
      name: true,
      built_in: true,
    },
  });
  const hasPermission =
    role?.built_in === true &&
    (role.name === "Owner" || role.name === "Manager");
  const whereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.week_start_date_from && {
      week_start_date: {
        gte: new Date(props.body.week_start_date_from),
      },
    }),
    ...(props.body.week_start_date_to && {
      week_start_date: {
        lte: new Date(props.body.week_start_date_to),
      },
    }),
    ...(!hasPermission && { employee_id: employee.id }),
  } satisfies Prisma.hrm_platform_timesheetsWhereInput;
  const data = await MyGlobal.prisma.hrm_platform_timesheets.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { week_start_date: "desc" },
    select: {
      id: true,
      week_start_date: true,
      week_end_date: true,
      status: true,
      submitted_at: true,
      reviewed_at: true,
      created_at: true,
      reviewed_by_id: true,
      employee: {
        select: {
          id: true,
          display_name: true,
          position: true,
          employment_type: true,
          status: true,
          department: {
            select: {
              id: true,
              name: true,
              description: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  parent_id: true,
                },
              },
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              built_in: true,
              created_at: true,
            },
          },
        },
      },
      reviewedBy: {
        select: {
          id: true,
          email: true,
          display_name: true,
          avatar_url: true,
          phone_number: true,
          created_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.hrm_platform_timesheets.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(data, async (timesheet) => {
    const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
      where: {
        timesheet_id: timesheet.id,
      },
      select: {
        duration_minutes: true,
      },
    });
    const totalHours =
      timelogs.reduce((sum, log) => sum + log.duration_minutes, 0) / 60;
    return {
      id: typia.assert<string & tags.Format<"uuid">>(timesheet.id),
      week_start_date: toISOStringSafe(timesheet.week_start_date),
      week_end_date: toISOStringSafe(timesheet.week_end_date),
      status: timesheet.status,
      total_hours: totalHours,
      submitted_at: timesheet.submitted_at
        ? toISOStringSafe(timesheet.submitted_at)
        : null,
      reviewed_at: timesheet.reviewed_at
        ? toISOStringSafe(timesheet.reviewed_at)
        : null,
      reviewer: timesheet.reviewedBy
        ? ({
            id: typia.assert<string & tags.Format<"uuid">>(
              timesheet.reviewedBy.id,
            ),
            email: typia.assert<string & tags.Format<"email">>(
              timesheet.reviewedBy.email,
            ),
            display_name: timesheet.reviewedBy.display_name,
            avatar_url: timesheet.reviewedBy.avatar_url ?? null,
            phone_number: timesheet.reviewedBy.phone_number ?? null,
            created_at: toISOStringSafe(timesheet.reviewedBy.created_at),
          } satisfies IHrmPlatformMember.ISummary)
        : null,
      employee: {
        id: typia.assert<string & tags.Format<"uuid">>(timesheet.employee.id),
        display_name: timesheet.employee.display_name,
        position: timesheet.employee.position ?? null,
        employment_type: timesheet.employee.employment_type,
        status: timesheet.employee.status,
        department: timesheet.employee.department
          ? ({
              id: typia.assert<string & tags.Format<"uuid">>(
                timesheet.employee.department.id,
              ),
              name: timesheet.employee.department.name,
              description: timesheet.employee.department.description ?? null,
              parent: timesheet.employee.department.parent
                ? ({
                    id: typia.assert<string & tags.Format<"uuid">>(
                      timesheet.employee.department.parent.id,
                    ),
                    name: timesheet.employee.department.parent.name,
                    description:
                      timesheet.employee.department.parent.description ?? null,
                    parent: null,
                  } satisfies IHrmPlatformDepartment.ISummary)
                : null,
            } satisfies IHrmPlatformDepartment.ISummary)
          : null,
        role: {
          id: typia.assert<string & tags.Format<"uuid">>(
            timesheet.employee.role.id,
          ),
          name: timesheet.employee.role.name,
          built_in: timesheet.employee.role.built_in,
          created_at: toISOStringSafe(timesheet.employee.role.created_at),
        } satisfies IHrmPlatformRole.ISummary,
      } satisfies IHrmPlatformEmployee.ISummary,
      created_at: toISOStringSafe(timesheet.created_at),
    } satisfies IHrmPlatformTimesheet.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIHrmPlatformTimesheet.ISummary;
}
