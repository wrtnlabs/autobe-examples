import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import type { IHrmTimeTrackingReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_report_snapshot } from "../prepare/prepare_random_hrm_time_tracking_report_snapshot";

export async function generate_random_hrm_time_tracking_reports_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingReportSnapshot.ICreate> | undefined;
    params: {
      reportId: string;
    };
  },
): Promise<IHrmTimeTrackingReportSnapshot> {
  const prepared: IHrmTimeTrackingReportSnapshot.ICreate =
    prepare_random_hrm_time_tracking_report_snapshot(props.body);
  const result: IHrmTimeTrackingReportSnapshot =
    await api.functional.hrmTimeTracking.reports.snapshots.create(connection, {
      body: prepared,
      reportId: props.params.reportId,
    });
  return result;
}
