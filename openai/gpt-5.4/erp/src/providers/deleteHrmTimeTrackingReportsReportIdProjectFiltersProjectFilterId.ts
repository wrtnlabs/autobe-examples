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

export async function deleteHrmTimeTrackingReportsReportIdProjectFiltersProjectFilterId(props: {
  reportId: string & tags.Format<"uuid">;
  projectFilterId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new globalThis.Date(),
  );
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_reports.findFirstOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    await tx.hrm_time_tracking_report_project_filters.findFirstOrThrow({
      where: {
        id: props.projectFilterId,
        hrm_time_tracking_report_id: props.reportId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    await tx.hrm_time_tracking_report_project_filters.update({
      where: {
        id: props.projectFilterId,
      },
      data: {
        updated_at: now,
        deleted_at: now,
      },
    });
  });
}
