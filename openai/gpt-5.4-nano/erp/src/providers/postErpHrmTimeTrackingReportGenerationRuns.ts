import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { IErpHrmTimeTrackingReportGenerationRun } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportGenerationRun";
import { IErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutput";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingReportGenerationRunCollector } from "../collectors/ErpHrmTimeTrackingReportGenerationRunCollector";
import { ErpHrmTimeTrackingReportGenerationRunTransformer } from "../transformers/ErpHrmTimeTrackingReportGenerationRunTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingReportGenerationRuns(props: {
  body: IErpHrmTimeTrackingReportGenerationRun.ICreate;
}): Promise<IErpHrmTimeTrackingReportGenerationRun> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const reportDefinition =
      await tx.erp_hrm_time_tracking_report_definitions.findUniqueOrThrow({
        where: { id: props.body.reportDefinitionId },
        select: { id: true, deleted_at: true },
      });
    if (reportDefinition.deleted_at !== null) {
      throw new HttpException("Report definition is not available", 400);
    }
    const created =
      await tx.erp_hrm_time_tracking_report_generation_runs.create({
        data: await ErpHrmTimeTrackingReportGenerationRunCollector.collect({
          body: props.body,
        }),
      });
    const run =
      await tx.erp_hrm_time_tracking_report_generation_runs.findUniqueOrThrow({
        where: { id: created.id },
        ...ErpHrmTimeTrackingReportGenerationRunTransformer.select(),
      });
    return await ErpHrmTimeTrackingReportGenerationRunTransformer.transform(
      run,
    );
  });
}
