import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmRoleAtSummaryTransformer } from "../transformers/ErpHrmRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberOrganizationsOrganizationIdRoles(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmRole.IRequest;
}): Promise<IPageIErpHrmRole.ISummary> {
  // 1. Verify organization exists and is not deleted
  const organization =
    await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: { id: true, deleted_at: true },
    });
  if (organization.deleted_at !== null) {
    throw new HttpException("Organization not found", 404);
  }
  // 2. Verify the requesting member belongs to this organization
  const membership =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: props.organizationId,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Build where clause
  const whereInput = {
    erp_hrm_organization_id: props.organizationId,
    ...(props.body.name !== undefined && {
      name: { contains: props.body.name },
    }),
    ...(props.body.is_builtin !== undefined &&
      props.body.is_builtin !== null && {
        is_builtin: props.body.is_builtin,
      }),
  } satisfies Prisma.erp_hrm_rolesWhereInput;
  // 4. Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 5. Sorting
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const orderByInput = (
    sortBy === "name" ? { name: sortOrder } : { created_at: sortOrder }
  ) satisfies Prisma.erp_hrm_rolesOrderByWithRelationInput;
  // 6. Query roles
  const data = await MyGlobal.prisma.erp_hrm_roles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmRoleAtSummaryTransformer.select(),
  });
  // 7. Count total
  const total = await MyGlobal.prisma.erp_hrm_roles.count({
    where: whereInput,
  });
  // 8. Transform
  const transformed = await ArrayUtil.asyncMap(
    data,
    ErpHrmRoleAtSummaryTransformer.transform,
  );
  // 9. Return paginated result
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
