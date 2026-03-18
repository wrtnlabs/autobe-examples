import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmDepartmentAtSummaryTransformer } from "../transformers/ErpHrmDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberDepartments(props: {
  member: MemberPayload;
  body: IErpHrmDepartment.IRequest;
}): Promise<IPageIErpHrmDepartment.ISummary> {
  // Get organization member to determine current organization context
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });
  const organizationId = orgMember.organization_id;
  // Build where clause
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "name";
  const sortOrder = props.body.sortOrder ?? "asc";
  // Sort field mapping
  const orderByField = sort === "createdAt" ? "created_at" : "name";
  const orderBy = {
    [orderByField]: sortOrder,
  } satisfies Prisma.erp_hrm_departmentsOrderByWithRelationInput;
  // Build where input
  const whereInput: Prisma.erp_hrm_departmentsWhereInput = {
    organization_id: organizationId,
    deleted_at: null,
    ...(props.body.name !== undefined && {
      name: {
        contains: props.body.name,
        mode: "insensitive",
      },
    }),
    ...(props.body.description !== undefined && {
      description: {
        contains: props.body.description,
        mode: "insensitive",
      },
    }),
    ...(props.body.parentDepartmentId !== undefined && {
      parent_department_id:
        props.body.parentDepartmentId === "null"
          ? null
          : props.body.parentDepartmentId,
    }),
  };
  // Query departments with pagination
  const departments = await MyGlobal.prisma.erp_hrm_departments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmDepartmentAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.erp_hrm_departments.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    departments,
    ErpHrmDepartmentAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
