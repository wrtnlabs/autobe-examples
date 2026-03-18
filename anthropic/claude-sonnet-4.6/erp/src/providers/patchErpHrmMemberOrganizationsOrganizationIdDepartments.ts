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

export async function patchErpHrmMemberOrganizationsOrganizationIdDepartments(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmDepartment.IRequest;
}): Promise<IPageIErpHrmDepartment.ISummary> {
  // 1. Verify organization exists and is not soft-deleted
  const organization = await MyGlobal.prisma.erp_hrm_organizations.findFirst({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // 2. Verify member belongs to this organization and is not soft-deleted
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: props.organizationId,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (orgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Build WHERE clause
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    organization_id: props.organizationId,
    deleted_at: null,
    ...(props.body.keyword != null && {
      name: { contains: props.body.keyword, mode: "insensitive" as const },
    }),
    ...("parentId" in props.body
      ? { parent_id: props.body.parentId ?? null }
      : {}),
  } satisfies Prisma.erp_hrm_departmentsWhereInput;
  // 4. Build ORDER BY
  const orderByInput = (
    props.body.sortBy === "name"
      ? { name: "asc" as const }
      : { created_at: "asc" as const }
  ) satisfies Prisma.erp_hrm_departmentsOrderByWithRelationInput;
  // 5. Query departments with pagination
  const data = await MyGlobal.prisma.erp_hrm_departments.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...ErpHrmDepartmentAtSummaryTransformer.select(),
  });
  // 6. Count total matching records
  const total = await MyGlobal.prisma.erp_hrm_departments.count({
    where: whereInput,
  });
  // 7. Transform and return
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmDepartmentAtSummaryTransformer.transform,
    ),
  };
}
