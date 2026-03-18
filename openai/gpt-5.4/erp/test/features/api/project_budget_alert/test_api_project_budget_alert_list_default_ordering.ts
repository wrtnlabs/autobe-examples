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

export async function test_api_project_budget_alert_list_default_ordering(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const request = {} satisfies IHrmTimeTrackingProjectBudgetAlert.IRequest;
  const firstPage =
    await api.functional.hrmTimeTracking.projectBudgetAlerts.index(
      actorConnection,
      {
        body: request,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current is positive when pages exist",
    firstPage.pagination.pages === 0 || firstPage.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination limit is non-negative",
    firstPage.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    firstPage.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    firstPage.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "data length does not exceed limit when limit is positive",
    firstPage.pagination.limit === 0 ||
      firstPage.data.length <= firstPage.pagination.limit,
    true,
  );
  TestValidator.equals(
    "empty records imply zero pages",
    firstPage.pagination.records !== 0 || firstPage.pagination.pages === 0,
    true,
  );
  TestValidator.equals(
    "page count matches ceiling formula when limit is positive",
    firstPage.pagination.limit === 0 ||
      firstPage.pagination.pages ===
        Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
    true,
  );
  TestValidator.equals(
    "non-empty pages imply current page within total pages",
    firstPage.pagination.pages === 0 ||
      firstPage.pagination.current <= firstPage.pagination.pages,
    true,
  );
  for (const item of firstPage.data) {
    TestValidator.predicate(
      "projects in analytical alert list always have budget hours",
      item.project.budget_hours !== null,
    );
  }
  for (let i = 1; i < firstPage.data.length; ++i) {
    const previous = firstPage.data[i - 1];
    const current = firstPage.data[i];
    const previousAlertPriority = previous.is_alert ? 1 : 0;
    const currentAlertPriority = current.is_alert ? 1 : 0;
    const previousWeekStart = new Date(previous.week_start_date).getTime();
    const currentWeekStart = new Date(current.week_start_date).getTime();
    const correctlyOrdered =
      previousAlertPriority > currentAlertPriority ||
      (previousAlertPriority === currentAlertPriority &&
        previousWeekStart > currentWeekStart) ||
      (previousAlertPriority === currentAlertPriority &&
        previousWeekStart === currentWeekStart &&
        previous.utilization_rate > current.utilization_rate) ||
      (previousAlertPriority === currentAlertPriority &&
        previousWeekStart === currentWeekStart &&
        previous.utilization_rate === current.utilization_rate &&
        previous.id <= current.id);
    TestValidator.equals(
      `default ordering at pair index ${i}`,
      correctlyOrdered,
      true,
    );
  }
  const secondPage =
    await api.functional.hrmTimeTracking.projectBudgetAlerts.index(
      actorConnection,
      {
        body: request,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "repeated read preserves ordered summary ids",
    secondPage.data.map((item) => item.id),
    firstPage.data.map((item) => item.id),
  );
}
