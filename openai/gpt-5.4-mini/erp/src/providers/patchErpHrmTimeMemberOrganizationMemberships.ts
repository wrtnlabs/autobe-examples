import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberOrganizationMemberships(props: {
  member: MemberPayload;
  body: IErpHrmTimeOrganizationMembership.IRequest;
}): Promise<IPageIErpHrmTimeOrganizationMembership.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const membershipWhere = {
    deleted_at: null,
  } satisfies Prisma.erp_hrm_time_organization_membershipsWhereInput;
  const data =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findMany({
      where: membershipWhere,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        status: true,
        is_selected_context: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: { select: {} },
        organization: { select: {} },
      },
    });
  const total =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.count({
      where: membershipWhere,
    });
  return {
    data: data.map((membership) => ({
      id: membership.id,
      member: {},
      organization: {},
      status: membership.status,
      isSelectedContext: membership.is_selected_context,
      createdAt: membership.created_at.toISOString(),
      updatedAt: membership.updated_at.toISOString(),
      deletedAt: membership.deleted_at?.toISOString() ?? null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
