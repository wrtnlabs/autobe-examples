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
  // Get member's employee record to extract organization context
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("You're not enrolled in any organization", 403);
  }
  const organizationId = employee.hrm_platform_organization_id;
  // Build where clause
  const whereInput: Prisma.hrm_platform_departmentsWhereInput = {
    hrm_platform_organization_id: organizationId,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.parent_department_id !== undefined && {
      parent_department_id: props.body.parent_department_id,
    }),
  };
  // Build order by
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
    };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Fetch data with parent department relation
  const data = await MyGlobal.prisma.hrm_platform_departments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      hrm_platform_organization_id: true,
      parent_department_id: true,
      parent: {
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  // Count total
  const total = await MyGlobal.prisma.hrm_platform_departments.count({
    where: whereInput,
  });
  // Transform results with parent department
  const transformedData = await ArrayUtil.asyncMap(data, async (dept) => {
    const transformed =
      await HrmPlatformDepartmentAtSummaryTransformer.transform(dept);
    // Transform parent department if exists
    if (dept.parent) {
      transformed.parent_department = {
        id: dept.parent.id,
        name: dept.parent.name,
        description: dept.parent.description ?? undefined,
        parent_department: null,
        created_at: toISOStringSafe(dept.parent.created_at),
        updated_at: toISOStringSafe(dept.parent.updated_at),
        deleted_at: dept.parent.deleted_at
          ? toISOStringSafe(dept.parent.deleted_at)
          : null,
      } satisfies IHrmPlatformDepartment.ISummary;
    } else {
      transformed.parent_department = null;
    }
    return transformed;
  });
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
