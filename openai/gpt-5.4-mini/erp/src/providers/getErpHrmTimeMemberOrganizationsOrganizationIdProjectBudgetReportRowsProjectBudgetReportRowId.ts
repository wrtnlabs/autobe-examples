import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeProjectBudgetReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectBudgetReportRow";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeProjectBudgetReportRowTransformer } from "../transformers/ErpHrmTimeProjectBudgetReportRowTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberOrganizationsOrganizationIdProjectBudgetReportRowsProjectBudgetReportRowId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  projectBudgetReportRowId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeProjectBudgetReportRow> {
  const row =
    await MyGlobal.prisma.erp_hrm_time_project_budget_report_rows.findFirstOrThrow(
      {
        where: {
          organization_id: props.organizationId,
          id: props.projectBudgetReportRowId,
        },
        ...ErpHrmTimeProjectBudgetReportRowTransformer.select(),
      },
    );
  return await ErpHrmTimeProjectBudgetReportRowTransformer.transform(row);
}
