import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import type { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import type { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import type { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_report_project_filter } from "../prepare/prepare_random_hrm_time_tracking_report_project_filter";

export async function generate_random_hrm_time_tracking_reports_project_filters_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingReportProjectFilter.ICreate> | undefined;
    params: {
      reportId: string;
    };
  },
): Promise<IHrmTimeTrackingReport> {
  const prepared: IHrmTimeTrackingReportProjectFilter.ICreate =
    prepare_random_hrm_time_tracking_report_project_filter(props.body);
  const result: IHrmTimeTrackingReport =
    await api.functional.hrmTimeTracking.reports.projectFilters.create(
      connection,
      {
        body: prepared,
        reportId: props.params.reportId,
      },
    );
  return result;
}
