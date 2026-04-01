import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { IErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutput";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingReportOutputTransformer } from "../transformers/ErpHrmTimeTrackingReportOutputTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeTrackingReportOutputsReportOutputId(props: {
  reportOutputId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportOutput.IUpdate;
}): Promise<IErpHrmTimeTrackingReportOutput> {
  await MyGlobal.prisma.erp_hrm_time_tracking_report_outputs.findUniqueOrThrow({
    where: { id: props.reportOutputId },
    select: {
      ...ErpHrmTimeTrackingReportOutputTransformer.select().select,
      reportGenerationRun: {
        select: {
          reportDefinition: {
            select: {
              erp_hrm_time_tracking_organization_id: true,
            },
          },
        },
      },
    },
  });
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (props.body.notes !== undefined) {
      await tx.erp_hrm_time_tracking_report_outputs.update({
        where: { id: props.reportOutputId },
        data: { notes: props.body.notes ?? null },
      });
    }
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_outputs.findUniqueOrThrow(
      {
        where: { id: props.reportOutputId },
        ...ErpHrmTimeTrackingReportOutputTransformer.select(),
      },
    );
  return ErpHrmTimeTrackingReportOutputTransformer.transform(updated as any);
}
