import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTimeTrackingReportSnapshotAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_report_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        output_uri: true,
        output_format: true,
        period_start: true,
        period_end: true,
        row_count: true,
        generated_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        report: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_time_tracking_reportsFindManyArgs,
      },
    } satisfies Prisma.hrm_time_tracking_report_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingReportSnapshot.ISummary> {
    return {
      id: input.id,
      output_uri: input.output_uri,
      output_format: input.output_format,
      period_start: input.period_start.toISOString(),
      period_end: input.period_end.toISOString(),
      row_count: input.row_count ?? null,
      generated_at: input.generated_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
