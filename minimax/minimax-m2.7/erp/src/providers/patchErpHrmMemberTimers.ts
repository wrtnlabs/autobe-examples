import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimerAtSummaryTransformer } from "../transformers/ErpHrmTimerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberTimers(props: {
  member: MemberPayload;
  body: IErpHrmTimer.IRequest;
}): Promise<IPageIErpHrmTimer.ISummary> {
  // Get pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get sort parameters with defaults
  const sortBy = props.body.sortBy ?? "started_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  // Get the employee's ID from the member session
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  // Build date range filter
  const startedAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.startDateFrom) {
    startedAtFilter.gte = new Date(props.body.startDateFrom);
  }
  if (props.body.startDateTo) {
    startedAtFilter.lte = new Date(props.body.startDateTo);
  }
  // Build complete WHERE clause
  const whereInput = {
    erp_hrm_employee_id: employee.id,
    ...(props.body.projectId && { erp_hrm_project_id: props.body.projectId }),
    ...(props.body.taskId && { erp_hrm_task_id: props.body.taskId }),
    ...(Object.keys(startedAtFilter).length > 0 && {
      started_at: startedAtFilter,
    }),
    ...(props.body.description && {
      description: {
        contains: props.body.description,
      },
    }),
  } satisfies Prisma.erp_hrm_timersWhereInput;
  // Build ORDER BY clause
  const orderByInput = (
    sortBy === "created_at"
      ? { created_at: sortOrder as "asc" | "desc" }
      : { started_at: sortOrder as "asc" | "desc" }
  ) satisfies Prisma.erp_hrm_timersOrderByWithRelationInput;
  // Query timers with pagination
  const timers = await MyGlobal.prisma.erp_hrm_timers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmTimerAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.erp_hrm_timers.count({
    where: whereInput,
  });
  // Transform results using the transformer
  const transformedTimers = await ArrayUtil.asyncMap(
    timers,
    ErpHrmTimerAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformedTimers,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
