import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimelogReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelogReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTimelogReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelogReport";
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

export async function patchHrmTimeTrackingMemberReportsTime(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingTimelogReport.IRequest;
}): Promise<IPageIHrmTimeTrackingTimelogReport> {
  const member =
    await MyGlobal.prisma.hrm_time_tracking_members.findFirstOrThrow({
      where: {
        id: props.member.id,
      },
      select: {
        id: true,
      },
    });
  void member;
  const permission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        role: {
          employees: {
            some: {
              id: props.member.id,
            },
          },
        },
        permission: {
          key: "report_view",
        },
      },
      select: {
        id: true,
      },
    });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.dateFrom > props.body.dateTo) {
    throw new HttpException("Invalid date range", 400);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const from = new Date(`${props.body.dateFrom}T00:00:00.000Z`);
  const to = new Date(`${props.body.dateTo}T23:59:59.999Z`);
  const timelogs = await MyGlobal.prisma.hrm_time_tracking_timelogs.findMany({
    where: {
      deleted_at: null,
      work_date: {
        gte: from,
        lte: to,
      },
      ...(props.body.employeeId !== undefined && {
        employee_id: props.body.employeeId,
      }),
      ...(props.body.projectId !== undefined && {
        project_id: props.body.projectId,
      }),
      ...(props.body.taskId !== undefined && { task_id: props.body.taskId }),
      ...(props.body.billable !== undefined && {
        billable: props.body.billable,
      }),
    },
    select: {
      employee_id: true,
      project_id: true,
      task_id: true,
      duration_minutes: true,
      billable: true,
    },
    orderBy: [{ work_date: "desc" }, { id: "desc" }],
  });
  type GroupRow = {
    key: string;
    employeeId?: string;
    projectId?: string;
    taskId?: string;
    totalMinutes: number;
    count: number;
    billableMinutes: number;
  };
  const grouped = new Map<string, GroupRow>();
  for (const timelog of timelogs) {
    const key =
      props.body.groupBy === "employee"
        ? timelog.employee_id
        : props.body.groupBy === "project"
          ? timelog.project_id
          : (timelog.task_id ?? "__unassigned__");
    const current = grouped.get(key);
    if (current !== undefined) {
      current.totalMinutes += timelog.duration_minutes;
      current.count += 1;
      current.billableMinutes += timelog.billable
        ? timelog.duration_minutes
        : 0;
    } else {
      grouped.set(key, {
        key,
        ...(props.body.groupBy === "employee"
          ? { employeeId: timelog.employee_id }
          : {}),
        ...(props.body.groupBy === "project"
          ? { projectId: timelog.project_id }
          : {}),
        ...(props.body.groupBy === "task"
          ? { taskId: timelog.task_id ?? undefined }
          : {}),
        totalMinutes: timelog.duration_minutes,
        count: 1,
        billableMinutes: timelog.billable ? timelog.duration_minutes : 0,
      });
    }
  }
  const rows = Array.from(grouped.values()).sort(
    (left, right) =>
      right.totalMinutes - left.totalMinutes ||
      left.key.localeCompare(right.key),
  );
  const totalCount = rows.length;
  const pageRows = rows.slice(skip, skip + limit);
  const totalMinutes = rows.reduce((sum, row) => sum + row.totalMinutes, 0);
  const totalHours = totalMinutes / 60;
  return {
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: totalCount === 0 ? 0 : Math.ceil(totalCount / limit),
    },
    data: pageRows.map(
      (row) =>
        ({
          groupBy: props.body.groupBy,
          dateFrom: props.body.dateFrom,
          dateTo: props.body.dateTo,
          employeeId: row.employeeId,
          projectId: row.projectId,
          taskId: row.taskId,
          billable: props.body.billable,
          groupedRows: true,
          totalHours,
          totalCount,
          page,
          limit,
        }) as IHrmTimeTrackingTimelogReport,
    ),
  };
}
