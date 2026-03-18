import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimesheetAtSummaryTransformer } from "../transformers/ErpHrmTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberTimesheets(props: {
  member: MemberPayload;
  body: IErpHrmTimesheet.IRequest;
}): Promise<IPageIErpHrmTimesheet.ISummary> {
  // Step 1: Resolve caller's organization member records with role permissions
  const callerOrgMembers =
    await MyGlobal.prisma.erp_hrm_organization_members.findMany({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role: {
          select: {
            permissions: {
              select: { permission_code: true },
            },
          },
        },
      },
    });
  // Step 2: Determine if caller is privileged (time:view_all or time:approve)
  const hasElevatedPermission = callerOrgMembers.some((m) =>
    m.role.permissions.some(
      (p) =>
        p.permission_code === "time:view_all" ||
        p.permission_code === "time:approve",
    ),
  );
  const callerOrgMemberIds = callerOrgMembers.map((m) => m.id);
  const callerOrgIds = callerOrgMembers.map((m) => m.organization_id);
  // Step 3: Build WHERE clause explicitly to avoid TS inference issues
  const whereInput: Prisma.erp_hrm_timesheetsWhereInput = {};
  if (hasElevatedPermission) {
    // Privileged: scope to all timesheets within caller's organization(s)
    whereInput.owner = {
      organization_id: { in: callerOrgIds },
    };
    // Optionally further filter to a specific organization member
    if (props.body.organizationMemberId !== undefined) {
      whereInput.organization_member_id = props.body.organizationMemberId;
    }
  } else {
    // Non-privileged: restrict to caller's own timesheets only
    whereInput.organization_member_id = { in: callerOrgMemberIds };
  }
  // Apply status filter
  if (props.body.statuses !== undefined && props.body.statuses.length > 0) {
    whereInput.status = { in: props.body.statuses };
  }
  // Apply date range filters — Prisma accepts ISO date strings directly for DateTime columns
  if (props.body.startDate !== undefined) {
    whereInput.week_start_date = { gte: props.body.startDate };
  }
  if (props.body.endDate !== undefined) {
    whereInput.week_end_date = { lte: props.body.endDate };
  }
  // Step 4: Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 5: Query data and total count sequentially
  const data = await MyGlobal.prisma.erp_hrm_timesheets.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { week_start_date: "desc" },
    ...ErpHrmTimesheetAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_timesheets.count({
    where: whereInput,
  });
  // Step 6: Transform and return paginated result
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimesheetAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
