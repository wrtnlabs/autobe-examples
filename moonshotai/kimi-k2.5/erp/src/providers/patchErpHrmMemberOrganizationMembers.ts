import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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

export async function patchErpHrmMemberOrganizationMembers(props: {
  member: MemberPayload;
  body: IErpHrmOrganizationMember.IRequest;
}): Promise<IPageIErpHrmOrganizationMember.ISummary> {
  // Get current member's organization context
  const currentMemberOrg =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: { organization_id: true },
    });
  if (!currentMemberOrg) {
    throw new HttpException("No organization membership found", 403);
  }
  const organizationId = currentMemberOrg.organization_id;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.erp_hrm_organization_membersWhereInput = {
    organization_id: { equals: organizationId },
    deleted_at: null,
    ...(props.body.isActive !== undefined && {
      is_active: props.body.isActive,
    }),
    ...(props.body.roleIds &&
      props.body.roleIds.length > 0 && { role_id: { in: props.body.roleIds } }),
    ...(props.body.departmentIds &&
      props.body.departmentIds.length > 0 && {
        department_id: props.body.departmentIds.includes("unassigned")
          ? props.body.departmentIds.length === 1
            ? { equals: null }
            : {
                in: props.body.departmentIds.filter(
                  (id): id is string & tags.Format<"uuid"> =>
                    id !== "unassigned",
                ),
                not: { equals: null },
              }
          : { in: props.body.departmentIds },
      }),
    ...(props.body.employmentType && {
      employment_type: Array.isArray(props.body.employmentType)
        ? { in: props.body.employmentType }
        : props.body.employmentType,
    }),
    ...(props.body.search && {
      OR: [
        { position: { contains: props.body.search, mode: "insensitive" } },
        {
          user: {
            OR: [
              {
                first_name: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
              {
                last_name: { contains: props.body.search, mode: "insensitive" },
              },
              { email: { contains: props.body.search, mode: "insensitive" } },
            ],
          },
        },
      ],
    }),
  };
  const data = await MyGlobal.prisma.erp_hrm_organization_members.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmOrganizationMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_organization_members.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmOrganizationMemberAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
