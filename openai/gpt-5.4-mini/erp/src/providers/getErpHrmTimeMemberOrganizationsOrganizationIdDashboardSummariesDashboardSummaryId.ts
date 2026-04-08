import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeOrganizationDashboardSummaryTransformer } from "../transformers/ErpHrmTimeOrganizationDashboardSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberOrganizationsOrganizationIdDashboardSummariesDashboardSummaryId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  dashboardSummaryId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeOrganizationDashboardSummary> {
  const summary =
    await MyGlobal.prisma.erp_hrm_time_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
      },
      ...ErpHrmTimeOrganizationDashboardSummaryTransformer.select(),
    });
  return await ErpHrmTimeOrganizationDashboardSummaryTransformer.transform(
    summary,
  );
}
