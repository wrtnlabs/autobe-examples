import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationWeeklySummary";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOrganizationWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganizationWeeklySummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_organization_weekly_summary_project_filtered_scope(
  connection: api.IConnection,
): Promise<void> {
  const organizationConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const page = 1 satisfies number as number;
  const limit = 10 satisfies number as number;
  const weekStartDate = new Date("2024-01-01T00:00:00.000Z").toISOString();
  const weekEndDate = new Date("2024-12-31T23:59:59.999Z").toISOString();
  const unfilteredBody = {
    page,
    limit,
    weekStartDate,
    weekEndDate,
    sort: "week_start_date_desc",
  } satisfies IHrmTimeTrackingOrganizationWeeklySummary.IRequest;
  const unfilteredPage =
    await api.functional.hrmTimeTracking.organizationWeeklySummaries.index(
      organizationConnection,
      {
        body: unfilteredBody,
      },
    );
  typia.assert(unfilteredPage);
  TestValidator.equals(
    "unfiltered current page matches request",
    unfilteredPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "unfiltered page limit matches request",
    unfilteredPage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "unfiltered data length respects limit",
    unfilteredPage.data.length <= limit,
  );
  TestValidator.predicate(
    "unfiltered page count is non-negative",
    unfilteredPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "unfiltered record count is non-negative",
    unfilteredPage.pagination.records >= 0,
  );
  for (const summary of unfilteredPage.data) {
    TestValidator.predicate(
      "unfiltered week start is not after week end",
      new Date(summary.week_start_date).getTime() <=
        new Date(summary.week_end_date).getTime(),
    );
  }
  if (unfilteredPage.data.length > 0) {
    const organizationId = unfilteredPage.data[0].organization.id;
    for (const summary of unfilteredPage.data) {
      TestValidator.equals(
        "unfiltered rows stay in one organization",
        summary.organization.id,
        organizationId,
      );
    }
  }
  const filteredBody = {
    page,
    limit,
    weekStartDate,
    weekEndDate,
    projectId: typia.random<string & tags.Format<"uuid">>(),
    sort: "week_start_date_desc",
  } satisfies IHrmTimeTrackingOrganizationWeeklySummary.IRequest;
  try {
    const filteredPage =
      await api.functional.hrmTimeTracking.organizationWeeklySummaries.index(
        organizationConnection,
        {
          body: filteredBody,
        },
      );
    typia.assert(filteredPage);
    TestValidator.equals(
      "filtered current page matches request",
      filteredPage.pagination.current,
      page,
    );
    TestValidator.equals(
      "filtered page limit matches request",
      filteredPage.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "filtered data length respects limit",
      filteredPage.data.length <= limit,
    );
    TestValidator.predicate(
      "filtered query does not broaden record count",
      filteredPage.pagination.records <= unfilteredPage.pagination.records,
    );
    for (const summary of filteredPage.data) {
      TestValidator.predicate(
        "filtered week start is not after week end",
        new Date(summary.week_start_date).getTime() <=
          new Date(summary.week_end_date).getTime(),
      );
    }
    if (filteredPage.data.length > 0) {
      const organizationId = filteredPage.data[0].organization.id;
      for (const summary of filteredPage.data) {
        TestValidator.equals(
          "filtered rows stay in one organization",
          summary.organization.id,
          organizationId,
        );
      }
    }
  } catch (exp) {
    await TestValidator.httpError(
      "invalid or cross-organization project filter can be rejected",
      [400, 401, 403, 404, 422],
      async () => {
        throw exp;
      },
    );
  }
}
