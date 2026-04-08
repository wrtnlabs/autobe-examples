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

export async function patchErpHrmTimeMemberOrganizationsOrganizationIdDashboardSummaries(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmTimeOrganizationDashboardSummary.IRequest;
}): Promise<IPageIErpHrmTimeOrganizationDashboardSummary.ISummary> {
  const organization =
    await MyGlobal.prisma.erp_hrm_time_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
      },
      ...ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.select(),
    });
  if (organization.ownerMember.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const data = [organization];
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: data.length,
      pages: Math.ceil(data.length / limit),
    },
  };
}
