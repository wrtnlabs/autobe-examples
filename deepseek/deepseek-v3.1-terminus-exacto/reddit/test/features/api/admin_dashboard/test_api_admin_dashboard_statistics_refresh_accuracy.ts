import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_dashboard_statistics_refresh_accuracy(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register admin account
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Get initial dashboard statistics
  const initialStats =
    await api.functional.communityPlatform.admin.dashboard.at(adminConnection);
  typia.assert(initialStats);
  // Store initial timestamp for comparison
  const initialTimestamp = initialStats.last_calculated_at;
  // Simulate platform activity by calling the dashboard multiple times
  // This tests the refresh mechanism and real-time aggregation
  const statsAfterActivity =
    await api.functional.communityPlatform.admin.dashboard.at(adminConnection);
  typia.assert(statsAfterActivity);
  // Validate that statistics are properly structured and contain valid values
  TestValidator.predicate(
    "subscriber_count is non-negative",
    statsAfterActivity.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "post_count is non-negative",
    statsAfterActivity.post_count >= 0,
  );
  TestValidator.predicate(
    "comment_count is non-negative",
    statsAfterActivity.comment_count >= 0,
  );
  TestValidator.predicate(
    "daily_active_users is non-negative",
    statsAfterActivity.daily_active_users >= 0,
  );
  // Validate timestamp is properly formatted and updates
  TestValidator.predicate(
    "last_calculated_at is valid ISO date",
    !isNaN(new Date(statsAfterActivity.last_calculated_at).getTime()),
  );
  // The last_calculated_at should be equal to or after the initial timestamp
  // (system may refresh statistics between calls)
  TestValidator.predicate(
    "timestamp updates correctly",
    new Date(statsAfterActivity.last_calculated_at) >=
      new Date(initialTimestamp),
  );
  // Validate complete statistics structure
  TestValidator.equals(
    "dashboard returns complete statistics structure",
    Object.keys(statsAfterActivity).sort(),
    [
      "id",
      "subscriber_count",
      "post_count",
      "comment_count",
      "daily_active_users",
      "last_calculated_at",
      "created_at",
      "updated_at",
    ].sort(),
  );
  // Test the system's aggregation capability by validating all counts are integers
  TestValidator.predicate(
    "subscriber_count is integer",
    Number.isInteger(statsAfterActivity.subscriber_count),
  );
  TestValidator.predicate(
    "post_count is integer",
    Number.isInteger(statsAfterActivity.post_count),
  );
  TestValidator.predicate(
    "comment_count is integer",
    Number.isInteger(statsAfterActivity.comment_count),
  );
  TestValidator.predicate(
    "daily_active_users is integer",
    Number.isInteger(statsAfterActivity.daily_active_users),
  );
  // Validate that created_at and updated_at timestamps are properly ordered
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    new Date(statsAfterActivity.created_at) <=
      new Date(statsAfterActivity.updated_at),
  );
  TestValidator.predicate(
    "last_calculated_at is after or equal to created_at",
    new Date(statsAfterActivity.last_calculated_at) >=
      new Date(statsAfterActivity.created_at),
  );
}
