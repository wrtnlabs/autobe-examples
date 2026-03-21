import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get employee record for this member to determine organization context
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      status: "active",
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  // Check permissions for viewing all timesheets
  const hasViewAllPermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: { in: ["time:view_all", "time:approve"] },
      },
      select: { id: true },
    });
  const canViewAll = hasViewAllPermission !== null;
  // Build date range filter
  const dateRange = {
    ...(props.body.from_date ? { gte: props.body.from_date } : {}),
    ...(props.body.to_date ? { lte: props.body.to_date } : {}),
  };
  // Build where clause
  const whereInput = {
    deleted_at: null,
    ...(canViewAll
      ? {
          employee: {
            erp_hrm_organization_id: employee.erp_hrm_organization_id,
            deleted_at: null,
          },
          ...(props.body.employee_id && {
            employee_id: props.body.employee_id,
          }),
        }
      : { employee_id: employee.id }),
    ...(props.body.status && { status: props.body.status }),
    ...((props.body.from_date || props.body.to_date) && {
      week_start_date: dateRange,
    }),
  } satisfies Prisma.erp_hrm_timesheetsWhereInput;
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
