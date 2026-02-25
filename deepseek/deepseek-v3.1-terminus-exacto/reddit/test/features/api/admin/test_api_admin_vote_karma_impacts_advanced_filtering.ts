import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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

export async function test_api_admin_vote_karma_impacts_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Update connection headers with authorization token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Test 1: Filter by positive karma delta range (upvotes)
  const positiveDeltaResponse =
    await api.functional.communityPlatform.admin.vote_karma_impacts.index(
      adminConnection,
      {
        body: {
          start_time: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_time: new Date().toISOString(),
          granularity: "day",
          metric_categories: ["karma_calculation"],
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(positiveDeltaResponse);
  // Test 2: Filter by specific date range (last 24 hours)
  const specificDateRangeResponse =
    await api.functional.communityPlatform.admin.vote_karma_impacts.index(
      adminConnection,
      {
        body: {
          start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end_time: new Date().toISOString(),
          granularity: "hour",
          metric_categories: ["transaction_times", "karma_calculation"],
          page: null,
          limit: null,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(specificDateRangeResponse);
  // Test 3: Filter with custom pagination parameters
  const paginationResponse =
    await api.functional.communityPlatform.admin.vote_karma_impacts.index(
      adminConnection,
      {
        body: {
          start_time: undefined,
          end_time: undefined,
          granularity: "day",
          metric_categories: undefined,
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(paginationResponse);
  // Test 4: Filter with all metric categories
  const allMetricsResponse =
    await api.functional.communityPlatform.admin.vote_karma_impacts.index(
      adminConnection,
      {
        body: {
          start_time: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_time: new Date().toISOString(),
          granularity: "week",
          metric_categories: [
            "transaction_times",
            "vote_rates",
            "karma_calculation",
            "error_rates",
            "resource_utilization",
          ],
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(allMetricsResponse);
  // Test 5: Filter with minimal parameters (default behavior)
  const minimalResponse =
    await api.functional.communityPlatform.admin.vote_karma_impacts.index(
      adminConnection,
      {
        body: {
          start_time: undefined,
          end_time: undefined,
          granularity: undefined,
          metric_categories: undefined,
          page: undefined,
          limit: undefined,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(minimalResponse);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    positiveDeltaResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is non-negative",
    positiveDeltaResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    positiveDeltaResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    positiveDeltaResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    positiveDeltaResponse.pagination.pages >= 0,
  );
  // Validate response data structure
  TestValidator.predicate(
    "data is an array",
    Array.isArray(positiveDeltaResponse.data),
  );
  if (positiveDeltaResponse.data.length > 0) {
    const firstItem = positiveDeltaResponse.data[0];
    TestValidator.predicate(
      "first item has uuid id",
      typeof firstItem.id === "string" && firstItem.id.length > 0,
    );
    TestValidator.predicate(
      "first item has karma delta",
      typeof firstItem.karma_delta === "number",
    );
    TestValidator.predicate(
      "first item has timestamp",
      typeof firstItem.created_at === "string",
    );
    TestValidator.predicate(
      "first item has user object",
      firstItem.user !== undefined,
    );
    if (firstItem.user) {
      TestValidator.predicate(
        "user has uuid id",
        typeof firstItem.user.id === "string" && firstItem.user.id.length > 0,
      );
      TestValidator.predicate(
        "user has username",
        typeof firstItem.user.username === "string",
      );
      TestValidator.predicate(
        "user has karma score",
        typeof firstItem.user.karma === "number",
      );
      TestValidator.predicate(
        "user has creation timestamp",
        typeof firstItem.user.created_at === "string",
      );
    }
  }
  // Test that different filter combinations return valid responses
  TestValidator.predicate(
    "positive delta filter returns valid response",
    positiveDeltaResponse.data !== undefined,
  );
  TestValidator.predicate(
    "date range filter returns valid response",
    specificDateRangeResponse.data !== undefined,
  );
  TestValidator.predicate(
    "pagination filter returns valid response",
    paginationResponse.data !== undefined,
  );
  TestValidator.predicate(
    "all metrics filter returns valid response",
    allMetricsResponse.data !== undefined,
  );
  TestValidator.predicate(
    "minimal filter returns valid response",
    minimalResponse.data !== undefined,
  );
}