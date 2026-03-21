import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmAdminOrganizationsOrganizationIdReportsTypes(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmReport.IReportType[]> {
  // Verify organization exists for data isolation
  await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
    where: { id: props.organizationId },
    select: { id: true },
  });
  // Return hardcoded report types metadata
  // This endpoint does not query actual report data - only returns available type options
  return [
    {
      report_type: "time_report",
      description:
        "Hours logged per employee for any date range, with breakdowns by employee, project, or task, and filtering by billable status",
    } satisfies IErpHrmReport.IReportType,
    {
      report_type: "project_budget_report",
      description:
        "Budget consumption across projects showing estimated vs actual hours",
    } satisfies IErpHrmReport.IReportType,
    {
      report_type: "weekly_summary_report",
      description: "Week-by-week statistics showing productivity trends",
    } satisfies IErpHrmReport.IReportType,
  ];
}
