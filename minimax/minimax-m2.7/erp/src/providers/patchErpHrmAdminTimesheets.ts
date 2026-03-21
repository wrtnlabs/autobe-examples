import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmTimesheetAtSummaryTransformer } from "../transformers/ErpHrmTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminTimesheets(props: {
  admin: AdminPayload;
  body: IErpHrmTimesheet.IRequest;
}): Promise<IPageIErpHrmTimesheet.ISummary> {
  // Pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Get admin's employee record for organization context and permission check
  const adminEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.admin.id,
      status: "active",
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      role: {
        select: {
          rolePermissions: {
            select: {
              permission: true,
            },
          },
        },
      },
    },
  });
  if (!adminEmployee) {
    throw new HttpException("Admin employee not found", 404);
  }
  // Check time:approve permission
  const hasTimeApprovePermission = adminEmployee.role.rolePermissions.some(
    (p) => p.permission === "time:approve",
  );
  // Build WHERE clause
  const whereClause: Prisma.erp_hrm_timesheetsWhereInput = {
    deleted_at: null,
    employee: {
      erp_hrm_organization_id: adminEmployee.erp_hrm_organization_id,
      deleted_at: null,
    },
  };
  // Apply status filter if provided
  if (props.body.status) {
    whereClause.status = props.body.status;
  }
  // Apply week date range filter if provided
  if (props.body.weekStartDateFrom || props.body.weekStartDateTo) {
    whereClause.week_start_date = {};
    if (props.body.weekStartDateFrom) {
      whereClause.week_start_date.gte = props.body.weekStartDateFrom;
    }
    if (props.body.weekStartDateTo) {
      whereClause.week_start_date.lte = props.body.weekStartDateTo;
    }
  }
  // Permission-based employee filtering
  // Without time:approve: scope to own timesheets
  // With time:approve: can filter by specific employee
  if (!hasTimeApprovePermission) {
    whereClause.erp_hrm_employee_id = adminEmployee.id;
  } else if (props.body.employeeId) {
    whereClause.erp_hrm_employee_id = props.body.employeeId;
  }
  // Determine sort order
  const orderByInput = (
    props.body.sort === "week_start_date"
      ? { week_start_date: "desc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.erp_hrm_timesheetsOrderByWithRelationInput;
  // Execute queries sequentially (not parallel)
  const data = await MyGlobal.prisma.erp_hrm_timesheets.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmTimesheetAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_timesheets.count({
    where: whereClause,
  });
  // Transform results using ArrayUtil.asyncMap
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ErpHrmTimesheetAtSummaryTransformer.transform,
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
