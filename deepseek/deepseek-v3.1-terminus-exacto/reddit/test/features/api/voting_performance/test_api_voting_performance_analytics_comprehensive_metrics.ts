import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteKarmaImpact";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_voting_performance_analytics_comprehensive_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create initial admin connection for authentication
  const authConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin
  const adminAuth = await authorize_admin_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test 1: Default parameters (last 7 days with daily granularity)
  const defaultConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  const defaultMetrics =
    await api.functional.communityPlatform.admin.analytics.voting_performance.index(
      defaultConnection,
      {
        body: {} satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(defaultMetrics);
  TestValidator.predicate(
    "default metrics has data",
    defaultMetrics.data.length > 0,
  );
  TestValidator.predicate(
    "default metrics has pagination",
    defaultMetrics.pagination.records > 0,
  );
  // Test 2: Specific time range with hourly granularity
  const hourlyConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const endTime = new Date().toISOString();
  const hourlyMetrics =
    await api.functional.communityPlatform.admin.analytics.voting_performance.index(
      hourlyConnection,
      {
        body: {
          start_time: startTime,
          end_time: endTime,
          granularity: "hour",
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(hourlyMetrics);
  TestValidator.predicate(
    "hourly metrics has data",
    hourlyMetrics.data.length > 0,
  );
  // Test 3: Filtered metric categories
  const filteredConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  const filteredMetrics =
    await api.functional.communityPlatform.admin.analytics.voting_performance.index(
      filteredConnection,
      {
        body: {
          metric_categories: ["transaction_times", "karma_calculation"],
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(filteredMetrics);
  TestValidator.predicate(
    "filtered metrics has data",
    filteredMetrics.data.length > 0,
  );
  // Test 4: Pagination scenarios
  const paginatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  const paginatedMetrics =
    await api.functional.communityPlatform.admin.analytics.voting_performance.index(
      paginatedConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(paginatedMetrics);
  TestValidator.predicate(
    "pagination current page",
    paginatedMetrics.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit",
    paginatedMetrics.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination records count",
    paginatedMetrics.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages calculation",
    paginatedMetrics.pagination.pages > 0,
  );
  // Validate performance benchmarks
  if (defaultMetrics.data.length > 0) {
    const latestMetric = defaultMetrics.data[0];
    TestValidator.predicate(
      "vote submission avg time reasonable",
      latestMetric.vote_submission_avg_time_ms >= 0,
    );
    TestValidator.predicate(
      "vote score update avg time reasonable",
      latestMetric.vote_score_update_avg_time_ms >= 0,
    );
    TestValidator.predicate(
      "karma calculation avg time reasonable",
      latestMetric.karma_calculation_avg_time_ms >= 0,
    );
    TestValidator.predicate(
      "feed score update avg time reasonable",
      latestMetric.feed_score_update_avg_time_ms >= 0,
    );
    TestValidator.predicate(
      "error rate reasonable",
      latestMetric.error_rate >= 0 && latestMetric.error_rate <= 100,
    );
    TestValidator.predicate(
      "system utilization reasonable",
      latestMetric.system_cpu_utilization >= 0 &&
        latestMetric.system_cpu_utilization <= 100,
    );
    TestValidator.predicate(
      "memory utilization reasonable",
      latestMetric.system_memory_utilization >= 0 &&
        latestMetric.system_memory_utilization <= 100,
    );
  }
}
