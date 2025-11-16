import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingAlgorithmConfigs";
import type { ICommunityPlatformRankingEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingEventLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformRankingEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformRankingEventLog";

/**
 * Validate that an authenticated administrator can search and filter ranking
 * event logs using query options, and retrieve paginated results.
 *
 * 1. Create and authenticate an administrator (join).
 * 2. Prepare ranking event log search filters: non-null event_type, interval,
 *    run_status, algorithm_config_id (random representative values), date
 *    ranges, pagination (page and limit), sort_by and sort_order.
 * 3. Call PATCH /communityPlatform/administrator/rankingEventLogs with the filter.
 * 4. Validate:
 *
 *    - Returned pagination metadata is present and matches the request.
 *    - Records returned (ICommunityPlatformRankingEventLog) conform to filter
 *         criteria whenever possible (allowing for random data).
 *    - Response has IPageICommunityPlatformRankingEventLog shape and typia.assert
 *         passes.
 *    - No extraneous fields present.
 *
 * This does not validate that non-admins are forbidden (see other test).
 */
export async function test_api_ranking_event_log_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      business_status: RandomGenerator.name(1),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Prepare representative filter values (using random values and enums for demo)
  const now = new Date();
  // Use a window of 60 days before and after now for filtering
  const startedAtFrom = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 60,
  ).toISOString();
  const startedAtTo = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 60,
  ).toISOString();
  const finishedAtFrom = startedAtFrom;
  const finishedAtTo = startedAtTo;
  // Representative event_type etc (simulate with plausible string values)
  const eventTypes = [
    "calculation",
    "recalculation",
    "anomaly",
    "rollback",
  ] as const;
  const intervals = ["day", "week", "month"] as const;
  const runStatuses = ["success", "error", "warning"] as const;

  const event_type = RandomGenerator.pick(eventTypes);
  const interval = RandomGenerator.pick(intervals);
  const run_status = RandomGenerator.pick(runStatuses);
  const algorithm_config_id = typia.random<string & tags.Format<"uuid">>();

  const requestBody = {
    event_type,
    interval,
    run_status,
    algorithm_config_id,
    started_at_from: startedAtFrom,
    started_at_to: startedAtTo,
    finished_at_from: finishedAtFrom,
    finished_at_to: finishedAtTo,
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort_by: RandomGenerator.pick([
      "created_at",
      "started_at",
      "event_type",
    ] as const),
    sort_order: RandomGenerator.pick(["asc", "desc"] as const),
  } satisfies ICommunityPlatformRankingEventLog.IRequest;

  // 3. Call the search endpoint with admin privileges
  const searchResult =
    await api.functional.communityPlatform.administrator.rankingEventLogs.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(searchResult);
  // 4. Check pagination correctness
  TestValidator.equals(
    "pagination current page matches",
    searchResult.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "pagination limit matches",
    searchResult.pagination.limit,
    requestBody.limit,
  );

  // 5. Optionally, check that returned records (if any) match at least primary filters
  for (const log of searchResult.data) {
    // Only check non-null filters (all are set here)
    TestValidator.equals("event_type matches", log.event_type, event_type);
    TestValidator.equals("interval matches", log.interval, interval);
    TestValidator.equals("run_status matches", log.run_status, run_status);
    TestValidator.equals(
      "algorithm_config_id matches",
      log.algorithm_config_id,
      algorithm_config_id,
    );
    TestValidator.predicate(
      "started_at in range",
      log.started_at >= startedAtFrom && log.started_at <= startedAtTo,
    );
    TestValidator.predicate(
      "finished_at in range",
      log.finished_at >= finishedAtFrom && log.finished_at <= finishedAtTo,
    );
  }
}
