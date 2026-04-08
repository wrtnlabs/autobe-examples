import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeWeeklySummaryReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeWeeklySummaryReportRow";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeWeeklySummaryReportRowTransformer } from "../transformers/ErpHrmTimeWeeklySummaryReportRowTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberOrganizationsOrganizationIdWeeklySummaryReportRowsWeeklySummaryReportRowId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  weeklySummaryReportRowId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeWeeklySummaryReportRow> {
  const row =
    await MyGlobal.prisma.erp_hrm_time_weekly_summary_report_rows.findUniqueOrThrow(
      {
        where: {
          id: props.weeklySummaryReportRowId,
        },
        select: {
          organization_id: true,
          ...ErpHrmTimeWeeklySummaryReportRowTransformer.select().select,
        },
      },
    );
  if (row.organization_id !== props.organizationId) {
    throw new HttpException("Not Found", 404);
  }
  return await ErpHrmTimeWeeklySummaryReportRowTransformer.transform(row);
}
