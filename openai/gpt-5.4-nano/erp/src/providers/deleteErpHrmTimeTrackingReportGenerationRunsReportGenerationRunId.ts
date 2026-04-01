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
  // Existence check (also ensures unavailable -> 404 via OrThrow)
  await MyGlobal.prisma.erp_hrm_time_tracking_report_generation_runs.findUniqueOrThrow(
    {
      where: { id: props.reportGenerationRunId },
      select: { id: true },
    },
  );
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_time_tracking_report_generation_runs.delete({
      where: { id: props.reportGenerationRunId },
    });
  });
}
