import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
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
  // Get employee and permissions for access control
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      role: {
        select: {
          permissions: {
            select: { permission: true },
          },
        },
      },
    },
  });
  const permissions = employee.role.permissions.map((p) => p.permission);
  const canViewAll =
    permissions.includes("time:view_all") ||
    permissions.includes("time:manage");
  // Build WHERE clause with all filters
  const whereInput = {
    employee: {
      erp_hrm_organization_id: employee.erp_hrm_organization_id,
      ...(props.body.employeeId !== undefined && { id: props.body.employeeId }),
      ...(!canViewAll && { id: employee.id }),
    },
    ...(props.body.projectId !== undefined && {
      erp_hrm_project_id: props.body.projectId,
    }),
    ...(props.body.taskId !== undefined &&
      props.body.taskId !== null && { erp_hrm_task_id: props.body.taskId }),
    ...(props.body.taskId === null && { erp_hrm_task_id: null }),
    ...(props.body.isActive === true && { deleted_at: null }),
    ...(props.body.isActive === false && { deleted_at: { not: null } }),
    ...(props.body.startedAtFrom !== undefined && {
      started_at: { gte: new Date(props.body.startedAtFrom) },
    }),
    ...(props.body.startedAtTo !== undefined && {
      started_at: { lte: new Date(props.body.startedAtTo) },
    }),
  } satisfies Prisma.erp_hrm_timersWhereInput;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query data with transformer select
  const data = await MyGlobal.prisma.erp_hrm_timers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmTimerAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.erp_hrm_timers.count({
    where: whereInput,
  });
  // Transform and return paginated results
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
