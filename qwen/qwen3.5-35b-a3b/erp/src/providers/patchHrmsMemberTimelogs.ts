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

export async function patchHrmsMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmsTimelog.IRequest;
}): Promise<IPageIHrmsTimelog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Find the employee record for this member in their organization
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrms_organization_id: true,
        hrms_organization_role_id: true,
      },
    });
  if (!organizationMember) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Check if user has time:view_all permission
  const hasTimeViewAll =
    await MyGlobal.prisma.hrms_organization_role_permissions
      .findFirst({
        where: {
          hrms_organization_role_id:
            organizationMember.hrms_organization_role_id,
          permission: "time:view_all",
        },
      })
      .then((p) => p !== null);
  // Find employee record for the authenticated user
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organization_member_id: organizationMember.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!employee) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Build where clause with permission-based filtering
  const whereClause: Prisma.hrms_timelogsWhereInput = {
    deleted_at: null,
    ...(props.body.date_range && {
      date: {
        gte: props.body.date_range.start_date,
        lte: props.body.date_range.end_date,
      },
    }),
    ...(hasTimeViewAll
      ? {}
      : {
          employee_id: employee.id,
        }),
  };
  // Fetch timelogs with related data
  const timelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { date: "desc" },
    include: {
      employee: {
        select: { display_name: true },
      },
      project: {
        select: { name: true },
      },
      task: {
        select: { title: true },
      },
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.hrms_timelogs.count({
    where: whereClause,
  });
  // Transform to response format
  const data = timelogs.map((timelog) => ({
    id: timelog.id as string & tags.Format<"uuid">,
    group_id: timelog.employee_id as string & tags.Format<"uuid">,
    group_name: timelog.employee.display_name,
    total_hours: timelog.duration_minutes / 60,
    billable_hours: timelog.billable ? timelog.duration_minutes / 60 : 0,
    non_billable_hours: !timelog.billable ? timelog.duration_minutes / 60 : 0,
    billable: timelog.billable,
    description: timelog.description ?? undefined,
    workDate: toISOStringSafe(timelog.date),
    projectId: timelog.project_id as string & tags.Format<"uuid">,
    taskId: timelog.task_id,
  })) satisfies IHrmsTimelog.ISummary[];
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
