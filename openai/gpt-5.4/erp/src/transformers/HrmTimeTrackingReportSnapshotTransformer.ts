import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingReportAtSummaryTransformer } from "./HrmTimeTrackingReportAtSummaryTransformer";

export namespace HrmTimeTrackingReportSnapshotTransformer {
  export type Payload = Prisma.hrm_time_tracking_report_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        report: HrmTimeTrackingReportAtSummaryTransformer.select(),
        output_uri: true,
        output_format: true,
        period_start: true,
        period_end: true,
        row_count: true,
        generated_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_report_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingReportSnapshot> {
    return {
      id: input.id,
      report: await HrmTimeTrackingReportAtSummaryTransformer.transform(
        input.report,
      ),
      output_uri: input.output_uri,
      output_format: input.output_format,
      period_start: input.period_start.toISOString(),
      period_end: input.period_end.toISOString(),
      row_count: input.row_count ?? null,
      generated_at: input.generated_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
