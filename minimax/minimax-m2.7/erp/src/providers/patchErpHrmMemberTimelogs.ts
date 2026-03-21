import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
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
  // 1. Get current employee's organization context and role permissions
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  if (employee.status !== "active") {
    throw new HttpException("Employee is not active", 403);
  }
  // 2. Check if role has time:view_all permission
  const rolePermissions =
    await MyGlobal.prisma.erp_hrm_role_permissions.findMany({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
      },
      select: {
        permission: true,
      },
    });
  const hasTimeViewAll = rolePermissions.some(
    (p) => p.permission === "time:view_all",
  );
  // 3. Get all employee IDs in the organization for view_all permission
  const organizationEmployees =
    await MyGlobal.prisma.erp_hrm_employees.findMany({
      where: {
        erp_hrm_organization_id: employee.erp_hrm_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const organizationEmployeeIds = organizationEmployees.map((e) => e.id);
  // 4. Build employee filter based on permission
  let employeeFilter: Prisma.erp_hrm_timelogsWhereInput;
  if (hasTimeViewAll) {
    employeeFilter = {
      erp_hrm_employee_id: {
        in: organizationEmployeeIds,
      },
    };
  } else {
    employeeFilter = {
      erp_hrm_employee_id: employee.id,
    };
  }
  // 5. Override employee filter if employee_id is provided and user has permission
  if (props.body.employee_id !== undefined && hasTimeViewAll) {
    employeeFilter = {
      erp_hrm_employee_id: props.body.employee_id,
    };
  }
  // 6. Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 7. Build where clause with all filters
  const whereInput: Prisma.erp_hrm_timelogsWhereInput = {
    ...employeeFilter,
    ...(props.body.project_id && {
      erp_hrm_project_id: props.body.project_id,
    }),
    ...(props.body.task_id && {
      erp_hrm_task_id: props.body.task_id,
    }),
    ...(props.body.billable !== undefined && {
      billable: props.body.billable,
    }),
    ...(props.body.start_date && {
      date: {
        gte: props.body.start_date,
      },
    }),
    ...(props.body.end_date && {
      date: {
        lte: props.body.end_date,
      },
    }),
    ...(props.body.search && {
      description: {
        contains: props.body.search,
      },
    }),
  };
  // 8. Query timelogs with full include to satisfy transformer type
  const rawTimelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      date: "desc",
    },
    include:
      ErpHrmTimelogAtSummaryTransformer.select() as Prisma.erp_hrm_timelogsInclude,
  });
  // 9. Get total count for pagination
  const total = await MyGlobal.prisma.erp_hrm_timelogs.count({
    where: whereInput,
  });
  // 10. Transform results - cast through unknown to satisfy TypeScript
  const data = await ArrayUtil.asyncMap(
    rawTimelogs as unknown as Parameters<
      typeof ErpHrmTimelogAtSummaryTransformer.transform
    >[0][],
    ErpHrmTimelogAtSummaryTransformer.transform,
  );
  // 11. Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  };
}
