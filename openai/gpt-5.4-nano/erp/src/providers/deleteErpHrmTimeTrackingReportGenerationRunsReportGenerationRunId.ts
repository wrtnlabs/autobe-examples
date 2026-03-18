import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmTimeTrackingReportGenerationRunsReportGenerationRunId(props: {
  reportGenerationRunId: string & tags.Format<"uuid">;
}): Promise<void> {
  const run =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_generation_runs.findUnique(
      {
        where: { id: props.reportGenerationRunId },
        select: {
          id: true,
          erp_hrm_time_tracking_report_definition_id: true,
        },
      },
    );
  if (!run) {
    throw new HttpException("Report generation run unavailable", 404);
  }
  const selectedOrgId: string | null =
    (props as any)?.customer?.selected_organization_id ?? null;
  if (selectedOrgId) {
    const reportDefinition =
      await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findUnique(
        {
          where: { id: run.erp_hrm_time_tracking_report_definition_id },
          select: { organization: { select: { id: true } } },
        },
      );
    if (
      !reportDefinition ||
      reportDefinition.organization.id !== selectedOrgId
    ) {
      throw new HttpException("Report generation run unavailable", 404);
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_time_tracking_report_generation_runs.delete({
      where: { id: props.reportGenerationRunId },
    });
  });
}
