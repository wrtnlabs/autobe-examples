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

export async function deleteErpHrmTimeTrackingReportOutputsReportOutputId(props: {
  reportOutputId: string & tags.Format<"uuid">;
}): Promise<void> {
  const prisma = MyGlobal.prisma;
  await prisma.$transaction(async (tx) => {
    const output = await tx.erp_hrm_time_tracking_report_outputs.findUnique({
      where: { id: props.reportOutputId },
      select: {
        id: true,
        report_generation_run_id: true,
        reportGenerationRun: { select: { id: true } },
      },
    });
    if (!output) {
      throw new HttpException("Not Found", 404);
    }
    const run =
      await tx.erp_hrm_time_tracking_report_generation_runs.findUniqueOrThrow({
        where: { id: output.report_generation_run_id },
        select: { id: true },
      });
    /* TODO authorization */ /* TODO authorization */ await tx.erp_hrm_time_tracking_report_outputs.delete(
      { where: { id: props.reportOutputId } },
    );
  });
}
