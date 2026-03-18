import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganizationMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "../transformers/ErpHrmOrganizationMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberOrganizationsOrganizationIdMembers(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmOrganizationMember.IRequest;
}): Promise<IPageIErpHrmOrganizationMember.ISummary> {
  // 1. Verify organization exists and is not deleted
  await MyGlobal.prisma.erp_hrm_organizations.findFirstOrThrow({
    where: { id: props.organizationId, deleted_at: null },
    select: { id: true },
  });
  // 2. Verify requesting member belongs to the organization and has employee:view permission
  const requestingMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: props.organizationId,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            permissions: {
              select: { permission_code: true },
            },
          },
        },
      },
    });
  if (requestingMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  const hasEmployeeViewPermission = requestingMember.role.permissions.some(
    (p) => p.permission_code === "employee:view",
  );
  if (!hasEmployeeViewPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 4. Build WHERE clause
  const keywordCondition:
    | Prisma.erp_hrm_organization_membersWhereInput[]
    | undefined =
    props.body.keyword != null
      ? [
          {
            position: {
              contains: props.body.keyword,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            member: {
              email: {
                contains: props.body.keyword,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        ]
      : undefined;
  const whereInput = {
    organization_id: props.organizationId,
    deleted_at: null,
    ...(props.body.status != null && { status: props.body.status }),
    ...(props.body.employment_type != null && {
      employment_type: props.body.employment_type,
    }),
    ...(props.body.department_id != null && {
      department_id: props.body.department_id,
    }),
    ...(props.body.role_id != null && { role_id: props.body.role_id }),
    ...(keywordCondition !== undefined && { OR: keywordCondition }),
  } satisfies Prisma.erp_hrm_organization_membersWhereInput;
  // 5. Build ORDER BY clause
  const sortMap: Record<
    string,
    Prisma.erp_hrm_organization_membersOrderByWithRelationInput
  > = {
    created_at_asc: { created_at: "asc" },
    created_at_desc: { created_at: "desc" },
    status_asc: { status: "asc" },
    status_desc: { status: "desc" },
    employment_type_asc: { employment_type: "asc" },
    employment_type_desc: { employment_type: "desc" },
    position_asc: { position: "asc" },
    position_desc: { position: "desc" },
  };
  const orderByInput: Prisma.erp_hrm_organization_membersOrderByWithRelationInput =
    (props.body.sort != null && sortMap[props.body.sort]) ||
    sortMap["created_at_desc"];
  // 6. Query data and total count (sequential, not parallel)
  const data = await MyGlobal.prisma.erp_hrm_organization_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmOrganizationMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_organization_members.count({
    where: whereInput,
  });
  // 7. Transform and return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmOrganizationMemberAtSummaryTransformer.transform,
    ),
  };
}
