import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimerAtSummaryTransformer } from "../transformers/HrmPlatformTimerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTimers(props: {
  member: MemberPayload;
  body: IHrmPlatformTimer.IRequest;
}): Promise<IPageIHrmPlatformTimer.ISummary> {
  // Get employee for the member in their organization context
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause with organization context
  const whereInput: Prisma.hrm_platform_timersWhereInput = {
    employee: {
      hrm_platform_organization_id: employee.hrm_platform_organization_id,
      deleted_at: null,
    },
    deleted_at: null,
    ...(props.body.employee_id && { employee_id: props.body.employee_id }),
    ...(props.body.project_id && { project_id: props.body.project_id }),
    ...(props.body.task_id !== undefined && { task_id: props.body.task_id }),
    ...(props.body.status && {
      ...(props.body.status === "active"
        ? { stopped_at: null }
        : { stopped_at: { not: null } }),
    }),
    ...(props.body.started_at_from && {
      started_at: { gte: new Date(props.body.started_at_from) },
    }),
    ...(props.body.started_at_to && {
      started_at: { lte: new Date(props.body.started_at_to) },
    }),
    ...(props.body.stopped_at_from !== undefined && {
      stopped_at: props.body.stopped_at_from
        ? { gte: new Date(props.body.stopped_at_from) }
        : null,
    }),
    ...(props.body.stopped_at_to !== undefined && {
      stopped_at: props.body.stopped_at_to
        ? { lte: new Date(props.body.stopped_at_to) }
        : null,
    }),
    ...(props.body.search && {
      description: { contains: props.body.search, mode: "insensitive" },
    }),
  };
  // Build orderBy clause
  const orderByInput: Prisma.hrm_platform_timersOrderByWithRelationInput[] = [
    props.body.sort_by === "started_at"
      ? { started_at: props.body.sort_order ?? "desc" }
      : props.body.sort_by === "stopped_at"
        ? { stopped_at: props.body.sort_order ?? "desc" }
        : { created_at: props.body.sort_order ?? "desc" },
  ];
  // Query timers with pagination
  const timers = await MyGlobal.prisma.hrm_platform_timers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformTimerAtSummaryTransformer.select(),
  } satisfies Prisma.hrm_platform_timersFindManyArgs);
  // Count total records
  const total = await MyGlobal.prisma.hrm_platform_timers.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    timers,
    HrmPlatformTimerAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
