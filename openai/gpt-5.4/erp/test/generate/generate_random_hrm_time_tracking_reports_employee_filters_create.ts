import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import type { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_report_employee_filter } from "../prepare/prepare_random_hrm_time_tracking_report_employee_filter";

export async function generate_random_hrm_time_tracking_reports_employee_filters_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IHrmTimeTrackingReportEmployeeFilter.ICreate>
      | undefined;
    params: {
      reportId: string;
    };
  },
): Promise<IHrmTimeTrackingReportEmployeeFilter> {
  const prepared: IHrmTimeTrackingReportEmployeeFilter.ICreate =
    prepare_random_hrm_time_tracking_report_employee_filter(props.body);
  const result: IHrmTimeTrackingReportEmployeeFilter =
    await api.functional.hrmTimeTracking.reports.employeeFilters.create(
      connection,
      {
        body: prepared,
        reportId: props.params.reportId,
      },
    );
  return result;
}
