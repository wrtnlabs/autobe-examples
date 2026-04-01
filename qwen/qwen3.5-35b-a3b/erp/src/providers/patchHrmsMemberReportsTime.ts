import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimelog";
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

export async function patchHrmsMemberReportsTime(props: {
  member: MemberPayload;
  body: IHrmsTimelog.IRequest;
}): Promise<IPageIHrmsTimelog.ISummary> {
  // Get organization context from member's organization member record
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Organization membership not found", 404);
  }
  // Parse date range - default to current week (Monday to Sunday)
  const startDateTime: string & tags.Format<"date-time"> = props.body.date_range
    ?.start_date
    ? props.body.date_range.start_date
    : (() => {
        const now = new Date();
        const dayOfWeek = now.getUTCDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : 1 - dayOfWeek;
        const monday = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + diffToMonday,
          ),
        );
        monday.setUTCHours(0, 0, 0, 0);
        return monday.toISOString() as string & tags.Format<"date-time">;
      })();
  const endDateTime: string & tags.Format<"date-time"> = props.body.date_range
    ?.end_date
    ? props.body.date_range.end_date
    : (() => {
        const now = new Date();
        const monday = new Date();
        monday.setUTCDate(monday.getUTCDate() - monday.getUTCDay() + 6);
        monday.setUTCHours(23, 59, 59, 999);
        return monday.toISOString() as string & tags.Format<"date-time">;
      })();
  // Parse date range for query filtering
  const startDate = new Date(startDateTime);
  const endDate = new Date(endDateTime);
  // Query for total hours aggregation by employee
  const totalHoursQuery = await MyGlobal.prisma.hrms_timelogs.groupBy({
    by: ["employee_id"],
    where: {
      deleted_at: null,
      date: {
        gte: startDate,
        lte: endDate,
      },
      employee: {
        organizationMember: {
          hrms_organization_id: organizationMember.hrms_organization_id,
        },
      },
    },
    _sum: {
      duration_minutes: true,
    },
  });
  // Query for billable hours aggregation by employee
  const billableHoursQuery = await MyGlobal.prisma.hrms_timelogs.groupBy({
    by: ["employee_id"],
    where: {
      deleted_at: null,
      date: {
        gte: startDate,
        lte: endDate,
      },
      billable: true,
      employee: {
        organizationMember: {
          hrms_organization_id: organizationMember.hrms_organization_id,
        },
      },
    },
    _sum: {
      duration_minutes: true,
    },
  });
  // Create billable hours lookup map
  const billableHoursMap = new Map(
    billableHoursQuery.map((q) => [
      q.employee_id,
      q._sum?.duration_minutes ?? 0,
    ]),
  );
  // Query for non-billable hours aggregation by employee
  const nonBillableHoursQuery = await MyGlobal.prisma.hrms_timelogs.groupBy({
    by: ["employee_id"],
    where: {
      deleted_at: null,
      date: {
        gte: startDate,
        lte: endDate,
      },
      billable: false,
      employee: {
        organizationMember: {
          hrms_organization_id: organizationMember.hrms_organization_id,
        },
      },
    },
    _sum: {
      duration_minutes: true,
    },
  });
  // Create non-billable hours lookup map
  const nonBillableHoursMap = new Map(
    nonBillableHoursQuery.map((q) => [
      q.employee_id,
      q._sum?.duration_minutes ?? 0,
    ]),
  );
  // Get unique employee IDs
  const employeeIds = Array.from(
    new Set(totalHoursQuery.map((q) => q.employee_id)),
  );
  // Fetch employee details for display names
  const employees = await MyGlobal.prisma.hrms_employees.findMany({
    where: {
      id: {
        in: employeeIds,
      },
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
    },
  });
  // Create employee name lookup map
  const employeeNameMap = new Map(employees.map((e) => [e.id, e.display_name]));
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build aggregated data with proper hour calculations
  const aggregatedData = totalHoursQuery.map((q) => {
    const totalMinutes = q._sum?.duration_minutes ?? 0;
    const billableMinutes = billableHoursMap.get(q.employee_id) ?? 0;
    const nonBillableMinutes = nonBillableHoursMap.get(q.employee_id) ?? 0;
    return {
      group_id: q.employee_id as string & tags.Format<"uuid">,
      group_name: employeeNameMap.get(q.employee_id) ?? "Unknown",
      total_hours: totalMinutes / 60,
      billable_hours: billableMinutes / 60,
      non_billable_hours: nonBillableMinutes / 60,
    } satisfies IHrmsTimelog.ISummary;
  });
  // Apply pagination
  const paginatedData = aggregatedData.slice(skip, skip + limit);
  return {
    data: paginatedData,
    pagination: {
      current: page,
      limit: limit,
      records: aggregatedData.length,
      pages: Math.ceil(aggregatedData.length / limit),
    } satisfies IPage.IPagination,
  };
}
