import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberEmployees(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployee.IRequest;
}): Promise<IPageIHrmPlatformEmployee.ISummary> {
  // Find member's employee record to get organization context
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      hrm_platform_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Member has no employee record", 403);
  }
  const organizationId = employee.hrm_platform_organization_id;
  // Build where clause
  const where: Prisma.hrm_platform_employeesWhereInput = {
    hrm_platform_organization_id: organizationId,
    deleted_at: null,
  };
  // Apply name filter (ILIKE on display_name via JOIN with members)
  if (props.body.name !== undefined) {
    where.user = {
      display_name: {
        contains: props.body.name,
        mode: "insensitive",
      },
    } satisfies Prisma.hrm_platform_membersWhereInput;
  }
  // Apply department filter
  if (props.body.departmentId !== undefined) {
    where.hrm_platform_department_id = props.body.departmentId;
  }
  // Apply employment type filter
  if (props.body.employmentType !== undefined) {
    where.employment_type = props.body.employmentType;
  }
  // Apply status filter
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  }
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sorting
  const orderBy: Prisma.hrm_platform_employeesOrderByWithRelationInput = {
    created_at: props.body.order ?? "desc",
  };
  // Execute query for data
  const data = await MyGlobal.prisma.hrm_platform_employees.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...HrmPlatformEmployeeAtSummaryTransformer.select(),
  });
  // Execute query for total count
  const total = await MyGlobal.prisma.hrm_platform_employees.count({ where });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmPlatformEmployeeAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformEmployee.ISummary;
}
