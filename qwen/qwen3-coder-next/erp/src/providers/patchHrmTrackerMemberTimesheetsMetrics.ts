import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerTimesheet";
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

export async function patchHrmTrackerMemberTimesheetsMetrics(props: {
  member: MemberPayload;
  body: IHrmTrackerTimesheet.IRequest;
}): Promise<IPageIHrmTrackerTimesheet.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Authorization: Check permissions
  const hasViewAll =
    await MyGlobal.prisma.hrm_tracker_role_permissions.findFirst({
      where: {
        role: {
          employees: {
            some: {
              id: props.member.id,
              deleted_at: null,
            },
          },
        },
        permission: {
          permission: "time:view_all",
        },
      },
    });
  const hasProjectAccess = !hasViewAll
    ? await MyGlobal.prisma.hrm_tracker_project_members.findFirst({
        where: {
          hrm_tracker_employee_id: props.member.id,
          deleted_at: null,
        },
        select: { project: { select: { id: true } } },
      })
    : null;
  // Build where clause for timesheets
  const where: Prisma.hrm_tracker_timesheetsWhereInput = {
    deleted_at: null,
    status: props.body.status,
    week_start_date: props.body.week_start_date
      ? {
          gte: new Date(props.body.week_start_date + "T00:00:00.000Z"),
        }
      : undefined,
    week_end_date: props.body.week_end_date
      ? {
          lte: new Date(props.body.week_end_date + "T23:59:59.999Z"),
        }
      : undefined,
  };
  if (!hasViewAll && !hasProjectAccess) {
    // Self-view only - filter by employee relation
    const employee = await MyGlobal.prisma.hrm_tracker_employees.findFirst({
      where: {
        id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!employee) {
      return {
        pagination: {
          current: page,
          limit: limit,
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
    where.employee = {
      id: employee.id,
    };
  } else if (!hasViewAll && hasProjectAccess) {
    // Project-based access - get employees in the same project
    const projectEmployeeIds =
      await MyGlobal.prisma.hrm_tracker_project_members.findMany({
        where: {
          project: {
            id: hasProjectAccess.project.id,
          },
          deleted_at: null,
        },
        select: { hrm_tracker_employee_id: true },
      });
    if (projectEmployeeIds.length === 0) {
      return {
        pagination: {
          current: page,
          limit: limit,
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
    where.hrm_tracker_employee_id = {
      in: projectEmployeeIds.map((pe) => pe.hrm_tracker_employee_id),
    };
  }
  // Fetch timesheets
  const timesheets = await MyGlobal.prisma.hrm_tracker_timesheets.findMany({
    where: where,
    skip: skip,
    take: limit,
    orderBy: props.body.search
      ? ({
          week_start_date: "desc",
        } satisfies Prisma.hrm_tracker_timesheetsOrderByWithRelationInput)
      : { week_start_date: "desc" },
  });
  const total = await MyGlobal.prisma.hrm_tracker_timesheets.count({
    where: where,
  });
  // Transform to summary format with proper date handling
  const data: IHrmTrackerTimesheet.ISummary[] = timesheets.map((t) => ({
    id: t.id,
    employee_id: t.hrm_tracker_employee_id,
    organization_id: t.hrm_tracker_organization_id,
    week_start_date: toISOStringSafe(t.week_start_date),
    week_end_date: toISOStringSafe(t.week_end_date),
    status: t.status as "draft" | "submitted" | "approved" | "rejected",
    total_hours: t.total_hours,
    submitted_at: t.submitted_at ? toISOStringSafe(t.submitted_at) : null,
    reviewed_at: t.reviewed_at ? toISOStringSafe(t.reviewed_at) : null,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
