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

export async function patchHrmsMemberEmployees(props: {
  member: MemberPayload;
  body: IHrmsEmployee.IRequest;
}): Promise<IPageIHrmsEmployee.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.page_size ?? props.body.limit ?? 20;
  const normalizedLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (page - 1) * normalizedLimit;
  const whereInput: Prisma.hrms_employeesWhereInput = {
    deleted_at: null,
    ...(props.body.department_id && {
      department_id: props.body.department_id,
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.search && {
      OR: [
        { display_name: { contains: props.body.search, mode: "insensitive" } },
        { position: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  };
  const orderByInput = (() => {
    const sortField = props.body.sort ?? "employee_name";
    const sortOrder =
      props.body.order ??
      (sortField === "total_hours" || sortField === "last_activity_date"
        ? "desc"
        : "asc");
    switch (sortField) {
      case "total_hours":
        return { created_at: sortOrder as "asc" | "desc" };
      case "employee_name":
        return { display_name: sortOrder as "asc" | "desc" };
      case "status":
        return { status: sortOrder as "asc" | "desc" };
      case "last_activity_date":
        return { created_at: sortOrder as "asc" | "desc" };
      default:
        return { display_name: "asc" as const };
    }
  })();
  const employees = await MyGlobal.prisma.hrms_employees.findMany({
    where: whereInput,
    skip,
    take: normalizedLimit,
    orderBy: orderByInput,
    select: {
      id: true,
      display_name: true,
      position: true,
      department_id: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.hrms_employees.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(employees, async (employee) => {
    const timelogAggregation = await MyGlobal.prisma.hrms_timelogs.aggregate({
      where: {
        employee_id: employee.id,
        deleted_at: null,
      },
      _sum: { duration_minutes: true },
      _count: { id: true },
    });
    const startDate = (() => {
      const now = new Date();
      const dayOfWeek = now.getUTCDay();
      const monday = new Date(now);
      monday.setUTCDate(
        now.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1),
      );
      monday.setUTCHours(0, 0, 0, 0);
      return monday;
    })();
    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 6);
    endDate.setUTCHours(23, 59, 59, 999);
    const [timesheetsSubmitted, timesheetsApproved, timesheetsDraft] =
      await Promise.all([
        MyGlobal.prisma.hrms_timesheets.count({
          where: {
            employee: {
              id: employee.id,
            },
            deleted_at: null,
            submitted_at: {
              gte: startDate,
              lte: endDate,
            },
            status: "submitted",
          },
        }),
        MyGlobal.prisma.hrms_timesheets.count({
          where: {
            employee: {
              id: employee.id,
            },
            deleted_at: null,
            submitted_at: {
              gte: startDate,
              lte: endDate,
            },
            status: "approved",
          },
        }),
        MyGlobal.prisma.hrms_timesheets.count({
          where: {
            employee: {
              id: employee.id,
            },
            deleted_at: null,
            submitted_at: {
              gte: startDate,
              lte: endDate,
            },
            status: "draft",
          },
        }),
      ]);
    return {
      id: employee.id,
      display_name: employee.display_name,
      position: employee.position as string,
      department_id: employee.department_id as string,
      total_hours_logged: timelogAggregation._sum.duration_minutes ?? 0,
      timelog_count: timelogAggregation._count.id ?? 0,
      timesheets_submitted: timesheetsSubmitted,
      timesheets_approved: timesheetsApproved,
      timesheets_pending: timesheetsDraft,
      status: employee.status,
    } satisfies IHrmsEmployee.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: normalizedLimit,
      records: total,
      pages: Math.ceil(total / normalizedLimit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIHrmsEmployee.ISummary;
}
