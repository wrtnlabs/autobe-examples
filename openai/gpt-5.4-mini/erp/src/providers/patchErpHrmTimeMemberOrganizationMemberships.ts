import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationMembership";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeOrganizationMembership";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeOrganizationMembershipAtSummaryTransformer } from "../transformers/ErpHrmTimeOrganizationMembershipAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberOrganizationMemberships(props: {
  member: MemberPayload;
  body: IErpHrmTimeOrganizationMembership.IRequest;
}): Promise<IPageIErpHrmTimeOrganizationMembership.ISummary> {
  const selectedMembership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        is_selected_context: true,
        deleted_at: null,
      },
      select: {
        erp_hrm_time_organization_id: true,
      },
    });
  if (selectedMembership === null)
    throw new HttpException("Selected organization context not found", 400);
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    erp_hrm_time_organization_id:
      selectedMembership.erp_hrm_time_organization_id,
    deleted_at: null,
    ...(props.body.erpHrmTimeMemberId !== undefined && {
      erp_hrm_time_member_id: props.body.erpHrmTimeMemberId,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.isSelectedContext !== undefined && {
      is_selected_context: props.body.isSelectedContext,
    }),
    ...(props.body.search !== undefined &&
      props.body.search.trim().length > 0 && {
        OR: [{ status: { contains: props.body.search, mode: "insensitive" } }],
      }),
  } satisfies Prisma.erp_hrm_time_organization_membershipsWhereInput;
  const orderBy = (
    props.body.sort === "updated_at"
      ? { updated_at: "desc" }
      : props.body.sort === "status"
        ? { status: "asc" }
        : props.body.sort === "is_selected_context"
          ? { is_selected_context: "desc" }
          : { created_at: "desc" }
  ) satisfies Prisma.erp_hrm_time_organization_membershipsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...ErpHrmTimeOrganizationMembershipAtSummaryTransformer.select(),
    });
  const records =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeOrganizationMembershipAtSummaryTransformer.transform,
    ),
  };
}
