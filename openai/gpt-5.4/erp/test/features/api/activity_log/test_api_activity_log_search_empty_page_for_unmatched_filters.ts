import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLog";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";

export async function test_api_activity_log_search_empty_page_for_unmatched_filters(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const unmatchedRequest = {
    actionType: `absent-action-${RandomGenerator.alphaNumeric(12)}`,
    targetEntity: `absent-target-${RandomGenerator.alphaNumeric(12)}`,
    search: `absent-search-${RandomGenerator.alphaNumeric(16)}`,
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingActivityLog.IRequest;
  const firstPage =
    await api.functional.hrmTimeTracking.manager.activityLogs.search(
      managerConnection,
      {
        body: unmatchedRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "unmatched filters return empty data on first page",
    firstPage.data.length,
    0,
  );
  TestValidator.equals(
    "empty first page keeps zero matching records",
    firstPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty first page keeps zero total pages",
    firstPage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "first page current metadata matches request",
    firstPage.pagination.current,
    unmatchedRequest.page,
  );
  TestValidator.equals(
    "first page limit metadata matches request",
    firstPage.pagination.limit,
    unmatchedRequest.limit,
  );
  const outOfRangeRequest = {
    ...unmatchedRequest,
    page: 999,
  } satisfies IHrmTimeTrackingActivityLog.IRequest;
  const outOfRangePage =
    await api.functional.hrmTimeTracking.manager.activityLogs.search(
      managerConnection,
      {
        body: outOfRangeRequest,
      },
    );
  typia.assert(outOfRangePage);
  TestValidator.equals(
    "out-of-range page remains empty for same unmatched filters",
    outOfRangePage.data.length,
    0,
  );
  TestValidator.equals(
    "out-of-range page preserves zero matching records",
    outOfRangePage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "out-of-range page preserves zero total pages",
    outOfRangePage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.equals(
    "out-of-range current metadata matches request",
    outOfRangePage.pagination.current,
    outOfRangeRequest.page,
  );
  TestValidator.equals(
    "out-of-range limit metadata matches request",
    outOfRangePage.pagination.limit,
    unmatchedRequest.limit,
  );
}
