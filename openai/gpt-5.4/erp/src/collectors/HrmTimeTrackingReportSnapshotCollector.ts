import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingReportSnapshotCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingReportSnapshot.ICreate;
    hrmTimeTrackingReports: IEntity;
  }) {
    const now: Date = new Date();
    return {
      id: v4(),
      output_uri: props.body.output_uri,
      output_format: props.body.output_format,
      period_start: new Date(props.body.period_start),
      period_end: new Date(props.body.period_end),
      row_count: props.body.row_count ?? null,
      generated_at: new Date(props.body.generated_at),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      report: {
        connect: {
          id: props.hrmTimeTrackingReports.id,
        },
      },
    } satisfies Prisma.hrm_time_tracking_report_snapshotsCreateInput;
  }
}
