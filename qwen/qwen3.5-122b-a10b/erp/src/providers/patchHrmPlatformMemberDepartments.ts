import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentAtSummaryTransformer } from "../transformers/HrmPlatformDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberDepartments(props: {
  member: MemberPayload;
  body: IHrmPlatformDepartment.IRequest;
}): Promise<IPageIHrmPlatformDepartment.ISummary> {
  // Resolve member's organization from employee record
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
    throw new HttpException("Member not enrolled in any organization", 403);
  }
  const organizationId = employee.hrm_platform_organization_id;
  // Build where clause
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_departmentsWhereInput = {
    hrm_platform_organization_id: organizationId,
    deleted_at: null,
    ...(props.body.parent_department_id !== undefined && {
      parent_department_id: props.body.parent_department_id ?? null,
    }),
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.hrm_platform_departmentsWhereInput;
  // Build order by clause
  const sort = props.body.sort ?? "created_at";
  const order = props.body.order ?? "asc";
  const allowedSortFields = ["name", "created_at", "updated_at"];
  const allowedOrderValues = ["asc", "desc"];
  if (!allowedSortFields.includes(sort)) {
    throw new HttpException(`Invalid sort field: ${sort}`, 400);
  }
  if (!allowedOrderValues.includes(order)) {
    throw new HttpException(`Invalid order value: ${order}`, 400);
  }
  const orderByInput: Prisma.hrm_platform_departmentsOrderByWithRelationInput =
    {
      [sort]: order,
    } satisfies Prisma.hrm_platform_departmentsOrderByWithRelationInput;
  // Fetch paginated departments
  const departments = await MyGlobal.prisma.hrm_platform_departments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformDepartmentAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.hrm_platform_departments.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    departments,
    HrmPlatformDepartmentAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformDepartment.ISummary;
}
