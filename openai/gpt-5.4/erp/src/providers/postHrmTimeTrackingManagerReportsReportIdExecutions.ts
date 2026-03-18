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
import { HrmTimeTrackingReportSnapshotCollector } from "../collectors/HrmTimeTrackingReportSnapshotCollector";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";
import { HrmTimeTrackingReportSnapshotTransformer } from "../transformers/HrmTimeTrackingReportSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingManagerReportsReportIdExecutions(props: {
  manager: ManagerPayload;
  reportId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingReportSnapshot.ICreate;
}): Promise<IHrmTimeTrackingReportSnapshot> {
  const report =
    await MyGlobal.prisma.hrm_time_tracking_reports.findFirstOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  await MyGlobal.prisma.hrm_time_tracking_managers.findFirstOrThrow({
    where: {
      id: props.manager.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (props.body.period_start > props.body.period_end) {
    throw new HttpException("Invalid report period", 400);
  }
  if (
    props.body.output_format !== "csv" &&
    props.body.output_format !== "xlsx" &&
    props.body.output_format !== "pdf"
  ) {
    throw new HttpException("Unsupported output format", 400);
  }
  const created =
    await MyGlobal.prisma.hrm_time_tracking_report_snapshots.create({
      data: await HrmTimeTrackingReportSnapshotCollector.collect({
        body: props.body,
        hrmTimeTrackingReports: {
          id: report.id,
        },
      }),
      ...HrmTimeTrackingReportSnapshotTransformer.select(),
    });
  return await HrmTimeTrackingReportSnapshotTransformer.transform(created);
}
