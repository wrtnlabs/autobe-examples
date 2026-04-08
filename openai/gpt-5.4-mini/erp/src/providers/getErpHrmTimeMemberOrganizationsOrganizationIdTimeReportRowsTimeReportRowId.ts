import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { IErpHrmTimeTimeReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimeReportRow";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimeReportRowTransformer } from "../transformers/ErpHrmTimeTimeReportRowTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberOrganizationsOrganizationIdTimeReportRowsTimeReportRowId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  timeReportRowId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTimeReportRow> {
  const row =
    await MyGlobal.prisma.erp_hrm_time_time_report_rows.findUniqueOrThrow({
      where: {
        id: props.timeReportRowId,
        organization_id: props.organizationId,
        deleted_at: null,
      },
      ...ErpHrmTimeTimeReportRowTransformer.select(),
    });
  return await ErpHrmTimeTimeReportRowTransformer.transform(row);
}
