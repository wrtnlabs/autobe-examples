import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsEmployee";
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

export async function patchHrmsMemberEmployeesAnalytics(props: {
  member: MemberPayload;
  body: IHrmsEmployee.IRequest;
}): Promise<IPageIHrmsEmployee.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.page_size ?? props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const memberMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrms_organization_id: true,
      },
    });
  if (memberMembership === null) {
    throw new HttpException("No organization membership found", 404);
  }
  const now = new Date();
  const currentDay = now.getDay();
  const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const startDate = props.body.start_date
    ? new Date(props.body.start_date)
    : monday;
  const endDate = props.body.end_date ? new Date(props.body.end_date) : sunday;
  if (props.body.department_id) {
    const department = await MyGlobal.prisma.hrms_departments.findFirst({
      where: {
        id: props.body.department_id,
        organization_id: memberMembership.hrms_organization_id,
        deleted_at: null,
      },
    });
    if (department === null) {
      throw new HttpException("Invalid department_id", 400);
    }
  }
  const employeeWhere: Prisma.hrms_employeesWhereInput = {
    organization_member_id: memberMembership.id,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.department_id && {
      department_id: props.body.department_id,
    }),
    ...(props.body.search && {
      OR: [
        { display_name: { contains: props.body.search, mode: "insensitive" } },
        { position: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  };
  const total = await MyGlobal.prisma.hrms_employees.count({
    where: employeeWhere,
  });
  const orderBy: Prisma.hrms_employeesOrderByWithRelationInput[] = [
    props.body.sort === "total_hours"
      ? {
          timelogs: {
            _sum: {
              duration_minutes: props.body.order ?? "desc",
            },
          },
        }
      : {},
    props.body.sort === "employee_name"
      ? {
          display_name: props.body.order ?? "asc",
        }
      : {},
    props.body.sort === "status"
      ? {
          status: props.body.order ?? "asc",
        }
      : {},
    props.body.sort === "last_activity_date"
      ? {
          timelogs: {
            _max: { created_at: props.body.order ?? "desc" },
          },
        }
      : {},
    props.body.sort === undefined
      ? {
          display_name: "asc",
        }
      : {},
  ].filter(
    (o) => Object.keys(o).length > 0,
  ) as Prisma.hrms_employeesOrderByWithRelationInput[];
  const employees = await MyGlobal.prisma.hrms_employees.findMany({
    where: employeeWhere,
    select: {
      id: true,
      display_name: true,
      position: true,
      department_id: true,
      status: true,
      timelogs: {
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          duration_minutes: true,
          created_at: true,
        },
      },
      timesheets: {
        where: {
          week_start_date: {
            gte: startDate,
          },
          week_end_date: {
            lte: endDate,
          },
        },
        select: {
          status: true,
        },
      },
    },
    skip,
    take: limit,
    orderBy,
  });
  const data = await ArrayUtil.asyncMap(employees, async (emp) => {
    const totalMinutes = emp.timelogs.reduce(
      (sum, tl) => sum + tl.duration_minutes,
      0,
    );
    const submitted = emp.timesheets.filter(
      (ts) => ts.status === "submitted",
    ).length;
    const approved = emp.timesheets.filter(
      (ts) => ts.status === "approved",
    ).length;
    const pending = emp.timesheets.filter((ts) => ts.status === "draft").length;
    return {
      id: emp.id,
      display_name: emp.display_name,
      position: emp.position ?? undefined,
      department_id:
        emp.department_id ?? "00000000-0000-0000-0000-000000000000",
      total_hours_logged: Math.round(totalMinutes / 60),
      timelog_count: emp.timelogs.length,
      timesheets_submitted: submitted,
      timesheets_approved: approved,
      timesheets_pending: pending,
      status: emp.status,
    } satisfies IHrmsEmployee.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIHrmsEmployee.ISummary;
}
