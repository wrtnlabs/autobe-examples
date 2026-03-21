import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogAtSummaryTransformer } from "../transformers/ErpHrmTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberTimelogs(props: {
  member: MemberPayload;
  body: IErpHrmTimelog.IRequest;
}): Promise<IPageIErpHrmTimelog.ISummary> {
  // Get member session to find organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  // Find employee record for this member in current organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: { id: true, erp_hrm_role_id: true },
  });
  // Check if user has time:view_all permission
  const permissionRecord =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "time:view_all",
      },
      select: { id: true },
    });
  const hasViewAllPermission = permissionRecord !== null;
  // Build date filter conditions
  const dateConditions: Prisma.DateTimeFieldUpdateOperationsInput[] = [];
  const dateFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.from !== null && props.body.from !== undefined) {
    dateFilter.gte = new Date(props.body.from);
  }
  if (props.body.to !== null && props.body.to !== undefined) {
    dateFilter.lte = new Date(props.body.to);
  }
  // Build WHERE clause
  const whereInput = {
    deleted_at: null,
    employee: {
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    // If no permission, restrict to own timelogs
    ...(hasViewAllPermission ? {} : { employee_id: employee.id }),
    // Apply date range filter
    ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    // Apply optional filters
    ...(props.body.projectId !== null && props.body.projectId !== undefined
      ? { project_id: props.body.projectId }
      : {}),
    ...(props.body.taskId !== null && props.body.taskId !== undefined
      ? { task_id: props.body.taskId }
      : {}),
    ...(props.body.billable !== null && props.body.billable !== undefined
      ? { billable: props.body.billable }
      : {}),
    // employeeId filter only for privileged users
    ...(hasViewAllPermission &&
    props.body.employeeId !== null &&
    props.body.employeeId !== undefined
      ? { employee_id: props.body.employeeId }
      : {}),
    ...(props.body.search
      ? {
          description: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        }
      : {}),
  } satisfies Prisma.erp_hrm_timelogsWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Execute queries
  const timelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: [{ date: "desc" }, { created_at: "desc" }],
    ...ErpHrmTimelogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_timelogs.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      timelogs,
      ErpHrmTimelogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
