import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeOrganizationDashboardSummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer } from "../transformers/ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberOrganizations(props: {
  member: MemberPayload;
  body: IErpHrmTimeOrganizationDashboardSummary.IRequest;
}): Promise<IPageIErpHrmTimeOrganizationDashboardSummary.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const orderBy: Prisma.erp_hrm_time_organizationsOrderByWithRelationInput =
    props.body.sort === "name_asc"
      ? { name: "asc" }
      : props.body.sort === "name_desc"
        ? { name: "desc" }
        : props.body.sort === "createdAt_asc"
          ? { created_at: "asc" }
          : props.body.sort === "createdAt_desc"
            ? { created_at: "desc" }
            : { created_at: "desc" };
  const where: Prisma.erp_hrm_time_organizationsWhereInput = {
    deleted_at: null,
    owner_member_id: props.member.id,
    ...(props.body.search !== undefined && {
      name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
  };
  const data = await MyGlobal.prisma.erp_hrm_time_organizations.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.erp_hrm_time_organizations.count({
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
      ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.transform,
    ),
  };
}
