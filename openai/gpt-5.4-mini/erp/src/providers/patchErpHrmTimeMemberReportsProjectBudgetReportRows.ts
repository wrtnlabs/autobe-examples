import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeProjectBudgetReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectBudgetReportRow";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeProjectBudgetReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeProjectBudgetReportRow";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeProjectBudgetReportRowAtSummaryTransformer } from "../transformers/ErpHrmTimeProjectBudgetReportRowAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberReportsProjectBudgetReportRows(props: {
  member: MemberPayload;
  body: IErpHrmTimeProjectBudgetReportRow.IRequest;
}): Promise<IPageIErpHrmTimeProjectBudgetReportRow.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const orderBy: Prisma.erp_hrm_time_project_budget_report_rowsOrderByWithRelationInput =
    (() => {
      if (
        props.body.sort === undefined ||
        props.body.sort === "report_date_desc"
      )
        return { report_date: "desc" };
      if (props.body.sort === "report_date_asc") return { report_date: "asc" };
      if (props.body.sort === "project_name_asc")
        return { project: { name: "asc" } };
      if (props.body.sort === "project_name_desc")
        return { project: { name: "desc" } };
      throw new HttpException("Unsupported report sort option", 400);
    })();
  const rows =
    await MyGlobal.prisma.erp_hrm_time_project_budget_report_rows.findMany({
      where: {
        project: {
          budget_hours: { not: null },
          deleted_at: null,
        },
      },
      skip,
      take: limit,
      orderBy,
      ...ErpHrmTimeProjectBudgetReportRowAtSummaryTransformer.select(),
    });
  const records =
    await MyGlobal.prisma.erp_hrm_time_project_budget_report_rows.count({
      where: {
        project: {
          budget_hours: { not: null },
          deleted_at: null,
        },
      },
    });
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      ErpHrmTimeProjectBudgetReportRowAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
