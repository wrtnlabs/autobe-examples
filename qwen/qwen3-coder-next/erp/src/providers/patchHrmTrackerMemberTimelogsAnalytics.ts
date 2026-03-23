import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerTimelogAtSummaryTransformer } from "../transformers/HrmTrackerTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTrackerMemberTimelogsAnalytics(props: {
  member: MemberPayload;
  body: IHrmTrackerTimelog.IRequest;
}): Promise<IHrmTrackerTimelog.ISummary> {
  const { member, body } = props;
  // Authorization: Regular members can only see their own employee timelogs
  // Users with time:view_all permission can access all timelogs in their organization
  const memberDetails = await MyGlobal.prisma.hrm_tracker_employees.findFirst({
    where: {
      user_id: member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
    },
  });
  if (!memberDetails) {
    throw new HttpException("Forbidden", 403);
  }
  const hasViewAll = false; // Simplified - no permission check implemented
  // Build where condition with member authorization and filters
  const where: Prisma.hrm_tracker_timelogsWhereInput = {
    employee_id: hasViewAll ? undefined : memberDetails.id,
    organization_id: memberDetails.organization_id,
    deleted_at: null,
    date: {
      gte: body.start_date ? body.start_date : undefined,
      lte: body.end_date ? body.end_date : undefined,
    },
  } satisfies Prisma.hrm_tracker_timelogsWhereInput;
  if (body.project_id !== undefined) {
    where.project_id = body.project_id;
  }
  if (body.task_id !== undefined) {
    where.task_id = body.task_id;
  }
  if (body.billable !== undefined) {
    where.billable = body.billable;
  }
  const timelogs = await MyGlobal.prisma.hrm_tracker_timelogs.findMany({
    where,
    ...HrmTrackerTimelogAtSummaryTransformer.select(),
    orderBy: { date: "desc" },
  });
  if (timelogs.length === 0) {
    const now = new Date();
    return {
      id: v4() as string & tags.Format<"uuid">,
      date: now.toISOString().split("T")[0] as string & tags.Format<"date">,
      duration_in_minutes: 0,
      billable: false,
      description: null,
      hours: 0,
      billable_hours: 0,
      non_billable_hours: 0,
    };
  }
  const aggregated = timelogs.reduce(
    (acc, tl) => {
      const hours = tl.duration_in_minutes / 60.0;
      acc.duration_in_minutes += tl.duration_in_minutes;
      acc.hours += hours;
      if (tl.billable) {
        acc.billable_hours += hours;
      } else {
        acc.non_billable_hours += hours;
      }
      return acc;
    },
    {
      duration_in_minutes: 0,
      hours: 0,
      billable_hours: 0,
      non_billable_hours: 0,
    },
  );
  const first = timelogs[0];
  return {
    id: v4() as string & tags.Format<"uuid">,
    date: first.date.toISOString().split("T")[0] as string &
      tags.Format<"date">,
    duration_in_minutes: aggregated.duration_in_minutes,
    billable: first.billable,
    description: first.description ?? null,
    hours: aggregated.hours,
    billable_hours: aggregated.billable_hours,
    non_billable_hours: aggregated.non_billable_hours,
    project: first.project
      ? {
          id: first.project.id as string & tags.Format<"uuid">,
          name: first.project.name,
          description: first.project.description ?? "",
          color: first.project.color,
          status: first.project.status,
        }
      : undefined,
    organization: first.organization
      ? {
          id: first.organization.id as string & tags.Format<"uuid">,
          name: first.organization.name,
        }
      : undefined,
  };
}
