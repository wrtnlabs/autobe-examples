import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimelog";
import { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
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

export async function patchHrmsMemberReportsWeekly(props: {
  member: MemberPayload;
  body: IHrmsTimelog;
}): Promise<IPageIHrmsTimelog.ISummary> {
  const startDate = props.body.current_week.start_date;
  const endDate = props.body.current_week.end_date;
  const organizationMembers =
    await MyGlobal.prisma.hrms_organization_members.findMany({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      select: { hrms_organization_id: true },
    });
  const organizationIds = organizationMembers.map(
    (om) => om.hrms_organization_id,
  );
  if (organizationIds.length === 0) {
    return {
      pagination: {
        current: 1,
        limit: 100,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  const organizationMemberIds =
    await MyGlobal.prisma.hrms_organization_members.findMany({
      where: {
        hrms_organization_id: {
          in: organizationIds,
        },
        deleted_at: null,
      },
      select: { id: true },
    });
  const employeeIds = await MyGlobal.prisma.hrms_employees.findMany({
    where: {
      organization_member_id: {
        in: organizationMemberIds.map((om) => om.id),
      },
      deleted_at: null,
    },
    select: { id: true },
  });
  const employeeIdSet = new Set(employeeIds.map((e) => e.id));
  const timelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      employee_id: {
        in: Array.from(employeeIdSet),
      },
      date: {
        gte: startDate,
        lte: endDate,
      },
      deleted_at: null,
    },
    select: {
      id: true,
      date: true,
      duration_minutes: true,
      employee_id: true,
      billable: true,
    },
    orderBy: [{ date: "asc" }],
  });
  const weeklyData: Record<
    string,
    {
      totalMinutes: number;
      count: number;
      employeeIds: Set<string>;
      billableMinutes: number;
      nonBillableMinutes: number;
    }
  > = {};
  for (const timelog of timelogs) {
    const weekKey = getWeekKey(timelog.date.toISOString());
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        totalMinutes: 0,
        count: 0,
        employeeIds: new Set(),
        billableMinutes: 0,
        nonBillableMinutes: 0,
      };
    }
    weeklyData[weekKey].totalMinutes += timelog.duration_minutes;
    weeklyData[weekKey].count += 1;
    weeklyData[weekKey].employeeIds.add(timelog.employee_id);
    if (timelog.billable) {
      weeklyData[weekKey].billableMinutes += timelog.duration_minutes;
    } else {
      weeklyData[weekKey].nonBillableMinutes += timelog.duration_minutes;
    }
  }
  const data = Object.entries(weeklyData).map(([weekKey, weekData]) => ({
    group_id: weekKey,
    group_name: `Week of ${weekKey}`,
    total_hours: weekData.totalMinutes / 60,
    billable_hours: weekData.billableMinutes / 60,
    non_billable_hours: weekData.nonBillableMinutes / 60,
  }));
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const paginatedData = data.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: data.length,
      pages: Math.ceil(data.length / limit),
    } satisfies IPage.IPagination,
    data: paginatedData,
  };
}
function getWeekKey(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  const dayOfWeek = date.getDay();
  const diffToMonday = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  date.setDate(diffToMonday);
  return date.toISOString().split("T")[0];
}
