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

export async function postHrmTimeTrackingReportsReportIdSnapshots(props: {
  reportId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingReportSnapshot.ICreate;
}): Promise<IHrmTimeTrackingReportSnapshot> {
  if (props.body.period_start > props.body.period_end) {
    throw new HttpException(
      "period_start must be less than or equal to period_end",
      400,
    );
  }
  if (
    props.body.row_count !== undefined &&
    props.body.row_count !== null &&
    props.body.row_count < 0
  ) {
    throw new HttpException(
      "row_count must be greater than or equal to 0",
      400,
    );
  }
  await MyGlobal.prisma.hrm_time_tracking_reports.findFirstOrThrow({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const now = new globalThis.Date().toISOString();
  const created =
    await MyGlobal.prisma.hrm_time_tracking_report_snapshots.create({
      data: {
        id: v4(),
        output_uri: props.body.output_uri,
        output_format: props.body.output_format,
        period_start: props.body.period_start,
        period_end: props.body.period_end,
        row_count: props.body.row_count ?? null,
        generated_at: props.body.generated_at,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        report: {
          connect: {
            id: props.reportId,
          },
        },
      },
      ...HrmTimeTrackingReportSnapshotTransformer.select(),
    });
  return await HrmTimeTrackingReportSnapshotTransformer.transform(created);
}
