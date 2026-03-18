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

export async function patchErpHrmMemberOrganizationMembers(props: {
  member: MemberPayload;
  body: IErpHrmOrganizationMember.IRequest;
}): Promise<IPageIErpHrmOrganizationMember.ISummary> {
  // Resolve the active organization from the caller's organization member record
  const callerMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: { organization_id: true },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const keywordCondition: Prisma.erp_hrm_organization_membersWhereInput =
    props.body.keyword != null
      ? {
          OR: [
            {
              position: {
                contains: props.body.keyword,
                mode: "insensitive",
              },
            },
            {
              member: {
                email: {
                  contains: props.body.keyword,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {};
  const whereInput = {
    organization_id: callerMember.organization_id,
    deleted_at: null,
    ...(props.body.status != null ? { status: props.body.status } : {}),
    ...(props.body.employment_type != null
      ? { employment_type: props.body.employment_type }
      : {}),
    ...(props.body.role_id != null ? { role_id: props.body.role_id } : {}),
    ...(props.body.department_id != null
      ? { department_id: props.body.department_id }
      : {}),
    ...keywordCondition,
  } satisfies Prisma.erp_hrm_organization_membersWhereInput;
  const orderByInput = (
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : props.body.sort === "status_asc"
        ? { status: "asc" as const }
        : props.body.sort === "status_desc"
          ? { status: "desc" as const }
          : props.body.sort === "employment_type_asc"
            ? { employment_type: "asc" as const }
            : props.body.sort === "employment_type_desc"
              ? { employment_type: "desc" as const }
              : props.body.sort === "position_asc"
                ? { position: "asc" as const }
                : props.body.sort === "position_desc"
                  ? { position: "desc" as const }
                  : { created_at: "desc" as const }
  ) satisfies Prisma.erp_hrm_organization_membersOrderByWithRelationInput;
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
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmOrganizationMemberAtSummaryTransformer.transform,
    ),
  };
}
