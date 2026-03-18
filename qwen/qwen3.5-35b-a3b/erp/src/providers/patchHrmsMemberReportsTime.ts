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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  // Validate page number
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  // Validate limit
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  // Calculate default date range (current calendar week Monday to Sunday)
  const now = new Date();
  const currentDayOfWeek = now.getUTCDay();
  const daysSinceMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  const monday = new Date(
    now.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000,
  );
  const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
  const startDate =
    props.body.date_range?.start_date ?? toISOStringSafe(monday);
  const endDate = props.body.date_range?.end_date ?? toISOStringSafe(sunday);
  // Determine grouping from metric_types or default to 'employee'
  const validMetricTypes = ["employee", "project", "task"];
  const metricType = props.body.metric_types?.[0];
  const grouping = validMetricTypes.includes(metricType ?? "")
    ? (metricType as "employee" | "project" | "task")
    : "employee";
  // Validate grouping
  if (!validMetricTypes.includes(grouping)) {
    throw new HttpException("Invalid grouping type", 400);
  }
  // Get organization_id from member's organization membership
  const orgMember = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
    },
    select: { hrms_organization_id: true },
  });
  if (!orgMember) {
    throw new HttpException("Organization membership not found", 404);
  }
  const organizationId = orgMember.hrms_organization_id;
  // Get employee IDs belonging to organization through hrms_organization_members
  const employeeIds = await MyGlobal.prisma.hrms_organization_members.findMany({
    where: {
      hrms_organization_id: organizationId,
    },
    select: { hrms_member_id: true },
  });
  const employeeIdList = employeeIds.map((e) => e.hrms_member_id);
  const timelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      deleted_at: null,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      employee_id: {
        in: employeeIdList,
      },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
        },
      },
      employee: {
        select: {
          id: true,
          display_name: true,
        },
      },
    },
  });
  // Group by selected criterion
  const grouped = timelogs.reduce(
    (acc, timelog) => {
      const key =
        grouping === "employee"
          ? timelog.employee_id
          : grouping === "project"
            ? timelog.project_id
            : timelog.task_id || "unassigned-task";
      if (!acc[key]) {
        acc[key] = {
          id: key,
          total_hours: 0,
          billable_hours: 0,
          non_billable_hours: 0,
        };
      }
      const hours = timelog.duration_minutes / 60;
      acc[key].total_hours += hours;
      if (timelog.billable) {
        acc[key].billable_hours += hours;
      } else {
        acc[key].non_billable_hours += hours;
      }
      return acc;
    },
    {} as Record<
      string,
      {
        id: string;
        total_hours: number;
        billable_hours: number;
        non_billable_hours: number;
      }
    >,
  );
  // Build response with group names
  const responseData: IHrmsTimelog.ISummary[] = Object.entries(grouped).map(
    ([groupId, data]) => {
      const firstTimelog = timelogs.find((t) =>
        grouping === "employee"
          ? t.employee_id === groupId
          : grouping === "project"
            ? t.project_id === groupId
            : t.task_id === groupId,
      );
      let groupName = "";
      if (grouping === "employee" && firstTimelog?.employee) {
        groupName = firstTimelog.employee.display_name;
      } else if (grouping === "project" && firstTimelog?.project) {
        groupName = firstTimelog.project.name;
      } else if (grouping === "task" && firstTimelog?.task) {
        groupName = firstTimelog.task.title;
      } else if (grouping === "task") {
        groupName = "Unassigned";
      }
      return {
        group_id: groupId as string & tags.Format<"uuid">,
        group_name: groupName,
        total_hours: data.total_hours,
        billable_hours: data.billable_hours,
        non_billable_hours: data.non_billable_hours,
      } satisfies IHrmsTimelog.ISummary;
    },
  );
  // Calculate pagination
  const total = responseData.length;
  const paginatedData = responseData.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: paginatedData,
  } satisfies IPageIHrmsTimelog.ISummary;
}
