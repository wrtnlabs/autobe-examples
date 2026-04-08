import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTimerAtSummaryTransformer } from "../transformers/HrmTimeTrackTimerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberTimers(props: {
  member: MemberPayload;
  body: IHrmTimeTrackTimer.IRequest;
}): Promise<IPageIHrmTimeTrackTimer.ISummary> {
  // Find the employee record for this member
  const employee = await MyGlobal.prisma.hrm_time_track_employees.findFirst({
    where: {
      hrm_time_track_member_id: props.member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause - employees can only see their own timers
  const whereInput: Prisma.hrm_time_track_timersWhereInput = {
    hrm_time_track_employee_id: employee.id,
    is_active: true,
  };
  // Apply optional filters
  if (props.body.employee_id !== undefined) {
    whereInput.hrm_time_track_employee_id = props.body.employee_id;
  }
  if (props.body.project_id !== undefined) {
    whereInput.hrm_time_track_project_id = props.body.project_id;
  }
  if (props.body.task_id !== undefined) {
    whereInput.hrm_time_track_task_id = props.body.task_id;
  }
  if (props.body.is_active !== undefined) {
    whereInput.is_active = props.body.is_active;
  }
  // Determine sort field and order
  const sortField = props.body.sort ?? "started_at";
  const sortOrder = props.body.order ?? "desc";
  // Query timers with pagination
  const records = await MyGlobal.prisma.hrm_time_track_timers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      [sortField]: sortOrder,
    } as Prisma.hrm_time_track_timersOrderByWithRelationInput,
    ...HrmTimeTrackTimerAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.hrm_time_track_timers.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackTimerAtSummaryTransformer.transform,
    ),
  };
}
