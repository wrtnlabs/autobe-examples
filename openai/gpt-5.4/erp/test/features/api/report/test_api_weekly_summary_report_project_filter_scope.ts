import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_weekly_summary_report_project_filter_scope(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const rangeStartDate = new Date("2026-01-01T00:00:00.000Z").toISOString();
  const rangeEndDate = new Date("2026-02-15T23:59:59.999Z").toISOString();
  const selectedProjectId = typia.random<string & tags.Format<"uuid">>();
  const unfilteredBody: IHrmTimeTrackingReport.IRequest = {
    range_start_date: rangeStartDate,
    range_end_date: rangeEndDate,
    page: 1,
    limit: 10,
  };
  const filteredBody: IHrmTimeTrackingReport.IRequest = {
    ...unfilteredBody,
    project_id: selectedProjectId,
  };
  TestValidator.equals(
    "changing only project filter preserves other request fields",
    filteredBody,
    {
      ...unfilteredBody,
      project_id: selectedProjectId,
    },
  );
  TestValidator.equals(
    "unfiltered request has no project filter",
    unfilteredBody.project_id,
    undefined,
  );
  TestValidator.equals(
    "filtered request uses selected project filter",
    filteredBody.project_id,
    selectedProjectId,
  );
  const unfiltered =
    await api.functional.hrmTimeTracking.owner.reports.weeklySummaries.index(
      ownerConnection,
      {
        body: unfilteredBody,
      },
    );
  typia.assert(unfiltered);
  const filtered =
    await api.functional.hrmTimeTracking.owner.reports.weeklySummaries.index(
      ownerConnection,
      {
        body: filteredBody,
      },
    );
  typia.assert(filtered);
  TestValidator.equals(
    "unfiltered current page preserved",
    unfiltered.pagination.current,
    unfilteredBody.page,
  );
  TestValidator.equals(
    "filtered current page preserved",
    filtered.pagination.current,
    filteredBody.page,
  );
  TestValidator.equals(
    "unfiltered page size preserved",
    unfiltered.pagination.limit,
    unfilteredBody.limit,
  );
  TestValidator.equals(
    "filtered page size preserved",
    filtered.pagination.limit,
    filteredBody.limit,
  );
  TestValidator.predicate(
    "unfiltered pagination record count is non-negative",
    unfiltered.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered pagination record count is non-negative",
    filtered.pagination.records >= 0,
  );
  TestValidator.predicate(
    "unfiltered pagination page count is non-negative",
    unfiltered.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "filtered pagination page count is non-negative",
    filtered.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "unfiltered remains paginated data response",
    Array.isArray(unfiltered.data),
  );
  TestValidator.predicate(
    "filtered remains paginated data response",
    Array.isArray(filtered.data),
  );
}
