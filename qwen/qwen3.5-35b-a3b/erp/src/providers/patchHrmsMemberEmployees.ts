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
  const limit = props.body.limit ?? props.body.page_size ?? 20;
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (page - 1) * safeLimit;
  const whereClause: Prisma.hrms_employeesWhereInput = {
    deleted_at: null,
  };
  if (props.body.department_id !== undefined) {
    whereClause.department_id = props.body.department_id;
  } else {
    whereClause.department_id = { not: null };
  }
  if (props.body.status !== undefined) {
    whereClause.status = props.body.status;
  }
  if (props.body.search !== undefined) {
    whereClause.OR = [
      { display_name: { contains: props.body.search, mode: "insensitive" } },
      { position: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  const total = await MyGlobal.prisma.hrms_employees.count({
    where: whereClause,
  });
  const order = props.body.order ?? "desc";
  const orderBy: Prisma.hrms_employeesOrderByWithRelationInput[] = [];
  if (props.body.sort === "total_hours") {
    orderBy.push({
      display_name: order === "asc" ? "asc" : "desc",
    });
  } else if (props.body.sort === "employee_name") {
    orderBy.push({
      display_name: order === "asc" ? "asc" : "desc",
    });
  } else if (props.body.sort === "status") {
    orderBy.push({
      status: order === "asc" ? "asc" : "desc",
    });
  } else if (props.body.sort === "last_activity_date") {
    orderBy.push({
      display_name: order === "asc" ? "asc" : "desc",
    });
  } else {
    orderBy.push({
      display_name: "asc",
    });
  }
  const employees = await MyGlobal.prisma.hrms_employees.findMany({
    where: whereClause,
    skip,
    take: safeLimit,
    orderBy,
    include: {
      timelogs: {
        select: {
          id: true,
          duration_minutes: true,
          created_at: true,
        },
      },
      timesheets: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });
  const data = await ArrayUtil.asyncMap(employees, async (employee) => {
    const timesheetCounts = employee.timesheets.reduce(
      (acc, ts) => {
        if (ts.status === "submitted") {
          acc.submitted++;
        } else if (ts.status === "approved") {
          acc.approved++;
        } else if (ts.status === "draft") {
          acc.pending++;
        }
        return acc;
      },
      { submitted: 0, approved: 0, pending: 0 },
    );
    return {
      id: employee.id,
      display_name: employee.display_name,
      position: employee.position ?? "",
      department_id: employee.department_id ?? "",
      total_hours_logged: employee.timelogs.reduce(
        (sum, tl) => sum + tl.duration_minutes,
        0,
      ),
      timelog_count: employee.timelogs.length,
      timesheets_submitted: timesheetCounts.submitted,
      timesheets_approved: timesheetCounts.approved,
      timesheets_pending: timesheetCounts.pending,
      status: employee.status,
    };
  });
  return {
    pagination: {
      current: page,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
    data,
  };
}
