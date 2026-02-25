import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test dashboard retrieval when the platform has minimal data - no communities,
 * few users, and limited activity. Verify the dashboard handles empty or sparse
 * data gracefully by returning valid pagination metadata with zero records.
 * Ensure platform health indicators show appropriate baseline values when
 * there's little activity. Validate that the dashboard still aggregates
 * available metrics correctly even with minimal data sources.
 */
export async function test_api_moderator_dashboard_empty_platform(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator-specific connection for authentication
  const authConnection: api.IConnection = { host: connection.host };
  // Authenticate as a moderator using the utility function
  await authorize_moderator_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Create a NEW connection object for the dashboard API call
  const dashboardConnection: api.IConnection = {
    host: connection.host,
    headers: { ...authConnection.headers },
  };
  // Retrieve the dashboard data
  const dashboard =
    await api.functional.communityPlatform.moderator.dashboards.at(
      dashboardConnection,
    );
  typia.assert(dashboard);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "current page should be non-negative",
    dashboard.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    dashboard.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    dashboard.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    dashboard.pagination.pages >= 0,
  );
  // Validate pagination calculation consistency
  TestValidator.predicate(
    "pagination pages calculation should be mathematically correct",
    dashboard.pagination.pages ===
      Math.ceil(
        dashboard.pagination.records / Math.max(dashboard.pagination.limit, 1),
      ),
  );
  // Validate empty data array when platform has no communities
  TestValidator.equals(
    "data array should be empty when no communities exist",
    dashboard.data.length,
    0,
  );
  // Validate that pagination records match data array length
  TestValidator.equals(
    "pagination records should match data array length",
    dashboard.pagination.records,
    dashboard.data.length,
  );
}
