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

export async function test_api_project_budget_alert_empty_result_page(
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
  const now: Date = new Date();
  const weekStartFrom: string = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const weekStartTo: string = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 372,
  ).toISOString();
  const weekEndFrom: string = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 373,
  ).toISOString();
  const weekEndTo: string = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 379,
  ).toISOString();
  const page = 1;
  const limit = 10;
  const body = {
    projectId: typia.random<string & tags.Format<"uuid">>(),
    isAlert: true,
    weekStartFrom,
    weekStartTo,
    weekEndFrom,
    weekEndTo,
    projectStatus: "active",
    search: `no-match-${RandomGenerator.alphabets(12)}`,
    sort: "-week_start_date",
    page,
    limit,
  } satisfies IHrmTimeTrackingProjectBudgetAlert.IRequest;
  const first = await api.functional.hrmTimeTracking.projectBudgetAlerts.index(
    readerConnection,
    {
      body,
    },
  );
  typia.assert<IPageIHrmTimeTrackingProjectBudgetAlert.ISummary>(first);
  TestValidator.equals(
    "requested page is preserved",
    first.pagination.current,
    page,
  );
  TestValidator.equals(
    "requested limit is preserved",
    first.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "empty result has zero records",
    first.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has zero pages",
    first.pagination.pages,
    0,
  );
  TestValidator.equals("empty result has no rows", first.data.length, 0);
  TestValidator.predicate(
    "pagination current is non-negative",
    first.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    first.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    first.pagination.pages >= 0,
  );
  const second = await api.functional.hrmTimeTracking.projectBudgetAlerts.index(
    readerConnection,
    {
      body,
    },
  );
  typia.assert<IPageIHrmTimeTrackingProjectBudgetAlert.ISummary>(second);
  TestValidator.equals(
    "repeated request keeps requested page",
    second.pagination.current,
    page,
  );
  TestValidator.equals(
    "repeated request keeps requested limit",
    second.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "repeated empty result has zero records",
    second.pagination.records,
    0,
  );
  TestValidator.equals(
    "repeated empty result has zero pages",
    second.pagination.pages,
    0,
  );
  TestValidator.equals(
    "repeated empty result has no rows",
    second.data.length,
    0,
  );
}
