import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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

export async function getErpHrmTimeMemberReportsWeeklySummaryReportRowsWeeklySummaryReportRowId(props: {
  member: MemberPayload;
  weeklySummaryReportRowId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeWeeklySummaryReportRow> {
  const row =
    await MyGlobal.prisma.erp_hrm_time_weekly_summary_report_rows.findUniqueOrThrow(
      {
        where: {
          id: props.weeklySummaryReportRowId,
        },
        ...ErpHrmTimeWeeklySummaryReportRowTransformer.select(),
      },
    );
  return await ErpHrmTimeWeeklySummaryReportRowTransformer.transform(row);
}
