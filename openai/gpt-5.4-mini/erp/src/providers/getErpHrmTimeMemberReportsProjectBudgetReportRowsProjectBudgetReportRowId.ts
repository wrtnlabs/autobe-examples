import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getErpHrmTimeMemberReportsProjectBudgetReportRowsProjectBudgetReportRowId(props: {
  member: MemberPayload;
  projectBudgetReportRowId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeProjectBudgetReportRow> {
  const row =
    await MyGlobal.prisma.erp_hrm_time_project_budget_report_rows.findUniqueOrThrow(
      {
        where: {
          id: props.projectBudgetReportRowId,
        },
        ...ErpHrmTimeProjectBudgetReportRowTransformer.select(),
      },
    );
  return await ErpHrmTimeProjectBudgetReportRowTransformer.transform(row);
}
