import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import type { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_report_task_filter } from "../prepare/prepare_random_hrm_time_tracking_report_task_filter";

export async function generate_random_hrm_time_tracking_reports_task_filters_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingReportTaskFilter.ICreate> | undefined;
    params: {
      reportId: string;
    };
  },
): Promise<IHrmTimeTrackingReportTaskFilter> {
  const prepared: IHrmTimeTrackingReportTaskFilter.ICreate =
    prepare_random_hrm_time_tracking_report_task_filter(props.body);
  const result: IHrmTimeTrackingReportTaskFilter =
    await api.functional.hrmTimeTracking.reports.taskFilters.create(
      connection,
      {
        body: prepared,
        reportId: props.params.reportId,
      },
    );
  return result;
}
