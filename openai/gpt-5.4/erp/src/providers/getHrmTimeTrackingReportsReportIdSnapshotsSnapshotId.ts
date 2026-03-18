import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingReportSnapshotTransformer } from "../transformers/HrmTimeTrackingReportSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingReportsReportIdSnapshotsSnapshotId(props: {
  reportId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingReportSnapshot> {
  await MyGlobal.prisma.hrm_time_tracking_reports.findFirstOrThrow({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const snapshot =
    await MyGlobal.prisma.hrm_time_tracking_report_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        hrm_time_tracking_report_id: props.reportId,
        deleted_at: null,
      },
      ...HrmTimeTrackingReportSnapshotTransformer.select(),
    });
  return await HrmTimeTrackingReportSnapshotTransformer.transform(snapshot);
}
