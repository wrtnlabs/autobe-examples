import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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
  // Get the employee record for the authenticated member
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  // Validate and apply defaults for pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.hrm_platform_timersWhereInput = {
    hrm_platform_employee_id: employee.id,
    deleted_at: null,
  };
  // Status filter
  if (props.body.status !== undefined) {
    if (props.body.status === "active") {
      whereInput.stopped_at = null;
    } else if (props.body.status === "stopped") {
      whereInput.stopped_at = {
        not: null,
      };
    }
  }
  // Date range filter
  const startedAtFilter: any = {};
  if (props.body.start_date !== undefined) {
    startedAtFilter.gte = new Date(props.body.start_date);
  }
  if (props.body.end_date !== undefined) {
    if (Object.keys(startedAtFilter).length > 0) {
      // If we already have a gte, keep it
      startedAtFilter.lte = new Date(props.body.end_date);
    } else {
      startedAtFilter.lte = new Date(props.body.end_date);
    }
  }
  if (Object.keys(startedAtFilter).length > 0) {
    whereInput.started_at = startedAtFilter;
  }
  // Project filter
  if (props.body.project_id !== undefined) {
    whereInput.hrm_platform_project_id = props.body.project_id;
  }
  // Task filter
  if (props.body.task_id !== undefined) {
    whereInput.hrm_platform_task_id = props.body.task_id;
  }
  // Search filter
  if (props.body.search !== undefined && props.body.search.length > 0) {
    whereInput.description = {
      contains: props.body.search,
    };
  }
  // Build ORDER BY clause with validation
  const sortField = (props.body.sort ?? "created_at") as
    | "created_at"
    | "started_at"
    | "stopped_at";
  const sortOrder = (props.body.order ?? "desc") as "asc" | "desc";
  const orderByInput: Prisma.hrm_platform_timersOrderByWithRelationInput = {
    [sortField]: sortOrder,
  };
  // Query timers
  const data = await MyGlobal.prisma.hrm_platform_timers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformTimerAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.hrm_platform_timers.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmPlatformTimerAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
