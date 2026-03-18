import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectBudgetAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectBudgetAlert";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingProjectBudgetAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProjectBudgetAlert";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_project_budget_alert_filtered_by_alert_status_project_state_and_name(
  connection: api.IConnection,
): Promise<void> {
  const readerConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const baseline =
    await api.functional.hrmTimeTracking.projectBudgetAlerts.index(
      readerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmTimeTrackingProjectBudgetAlert.IRequest,
      },
    );
  typia.assert(baseline);
  TestValidator.equals(
    "baseline page current is first page",
    baseline.pagination.current,
    1,
  );
  TestValidator.equals(
    "baseline page limit matches request",
    baseline.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "baseline records non-negative",
    baseline.pagination.records >= 0,
  );
  TestValidator.predicate(
    "baseline pages non-negative",
    baseline.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "baseline data length within limit",
    baseline.data.length <= baseline.pagination.limit,
  );
  if (baseline.data.length === 0) {
    const emptyFiltered =
      await api.functional.hrmTimeTracking.projectBudgetAlerts.index(
        readerConnection,
        {
          body: {
            isAlert: true,
            projectStatus: RandomGenerator.name(1),
            search: RandomGenerator.alphabets(12),
            page: 1,
            limit: 10,
          } satisfies IHrmTimeTrackingProjectBudgetAlert.IRequest,
        },
      );
    typia.assert(emptyFiltered);
    TestValidator.equals(
      "empty baseline fallback page current is first page",
      emptyFiltered.pagination.current,
      1,
    );
    TestValidator.equals(
      "empty baseline fallback limit matches request",
      emptyFiltered.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "empty baseline fallback records non-negative",
      emptyFiltered.pagination.records >= 0,
    );
    TestValidator.predicate(
      "empty baseline fallback pages non-negative",
      emptyFiltered.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "empty baseline fallback data length within limit",
      emptyFiltered.data.length <= emptyFiltered.pagination.limit,
    );
    return;
  }
  const anchor = baseline.data[0];
  const searchSource =
    anchor.project.name.length >= 3
      ? anchor.project.name
      : `${anchor.project.name}${RandomGenerator.alphabets(3)}`;
  const sampledSearch = RandomGenerator.substring(searchSource);
  const searchTerm = sampledSearch.length !== 0 ? sampledSearch : searchSource;
  const requestedLimit = 10;
  const tolerance = 0.000001;
  const actualHoursMin = anchor.actual_hours - tolerance;
  const actualHoursMax = anchor.actual_hours + tolerance;
  const utilizationRateMin = anchor.utilization_rate - tolerance;
  const utilizationRateMax = anchor.utilization_rate + tolerance;
  const thresholdRateMin = anchor.threshold_rate - tolerance;
  const thresholdRateMax = anchor.threshold_rate + tolerance;
  const filteredRequest = {
    isAlert: anchor.is_alert,
    projectStatus: anchor.project.status,
    search: searchTerm,
    weekStartFrom: anchor.week_start_date,
    weekStartTo: anchor.week_start_date,
    weekEndFrom: anchor.week_end_date,
    weekEndTo: anchor.week_end_date,
    actualHoursMin,
    actualHoursMax,
    utilizationRateMin,
    utilizationRateMax,
    thresholdRateMin,
    thresholdRateMax,
    page: 1,
    limit: requestedLimit,
  } satisfies IHrmTimeTrackingProjectBudgetAlert.IRequest;
  const filtered =
    await api.functional.hrmTimeTracking.projectBudgetAlerts.index(
      readerConnection,
      {
        body: filteredRequest,
      },
    );
  typia.assert(filtered);
  TestValidator.equals(
    "filtered page current is first page",
    filtered.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered page limit matches request",
    filtered.pagination.limit,
    requestedLimit,
  );
  TestValidator.predicate(
    "filtered records non-negative",
    filtered.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered pages non-negative",
    filtered.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "filtered data length within limit",
    filtered.data.length <= filtered.pagination.limit,
  );
  const normalizedSearch = searchTerm.toLowerCase();
  for (const row of filtered.data) {
    TestValidator.equals(
      "row alert status matches filter",
      row.is_alert,
      anchor.is_alert,
    );
    TestValidator.equals(
      "row project status matches filter",
      row.project.status,
      anchor.project.status,
    );
    TestValidator.predicate(
      "row project name matches search",
      row.project.name.toLowerCase().includes(normalizedSearch),
    );
    TestValidator.equals(
      "row week start matches exact boundary",
      row.week_start_date,
      anchor.week_start_date,
    );
    TestValidator.equals(
      "row week end matches exact boundary",
      row.week_end_date,
      anchor.week_end_date,
    );
    TestValidator.predicate(
      "row actual hours within inclusive bounds",
      row.actual_hours >= actualHoursMin && row.actual_hours <= actualHoursMax,
    );
    TestValidator.predicate(
      "row utilization rate within inclusive bounds",
      row.utilization_rate >= utilizationRateMin &&
        row.utilization_rate <= utilizationRateMax,
    );
    TestValidator.predicate(
      "row threshold rate within inclusive bounds",
      row.threshold_rate >= thresholdRateMin &&
        row.threshold_rate <= thresholdRateMax,
    );
    TestValidator.equals(
      "joined project organization id remains scoped",
      row.project.organization.id,
      anchor.project.organization.id,
    );
    TestValidator.equals(
      "joined project organization name remains scoped",
      row.project.organization.name,
      anchor.project.organization.name,
    );
    TestValidator.predicate(
      "joined project id is non-empty",
      row.project.id.length > 0,
    );
  }
  TestValidator.predicate(
    "filtered results include anchor project context",
    ArrayUtil.has(filtered.data, (row) => row.project.id === anchor.project.id),
  );
}
