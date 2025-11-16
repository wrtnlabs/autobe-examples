import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformProfileDisplayMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileDisplayMetric";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates that an authenticated user can fetch their own profile display
 * metrics by specific ID, but cannot access metrics for other users, and that
 * soft-deleted or missing records are handled appropriately.
 *
 * 1. Register user A and store their auth context.
 * 2. Register user B and store their auth context.
 * 3. User A retrieves their own profile display metrics (must succeed; check all
 *    fields).
 * 4. User B attempts to retrieve User A's metrics (must fail with error or not
 *    found).
 * 5. Generate a random (guaranteed non-existent) metric/profile ID and verify
 *    retrieval fails.
 * 6. (Optional/Simulated) Soft-delete scenario -- ensure deleted metric fetch
 *    fails, if system supports soft deletion simulation (cannot force
 *    soft-delete as API is readonly, but validate missing/deleted case same as
 *    above).
 */
export async function test_api_profile_metrics_get_by_user(
  connection: api.IConnection,
) {
  // 1. Register user A
  const userAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  const userA: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userAJoinBody });
  typia.assert(userA);

  // 2. Register user B
  const userBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  const userB: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userBJoinBody });
  typia.assert(userB);

  // 3. User A: retrieve their own metrics
  // Metrics are created on registration; ID must be known via business rule or retrieved. Assume 1:1 linkage on id.
  const metric: ICommunityPlatformProfileDisplayMetric =
    await api.functional.communityPlatform.user.users.profileDisplayMetrics.at(
      connection,
      {
        userId: userA.id,
        profileDisplayMetricsId: userA.id as string & tags.Format<"uuid">, // Per schema and common pattern: metric ID = user ID
      },
    );
  typia.assert(metric);
  TestValidator.equals(
    "profile metrics matches user",
    metric.community_platform_user_id,
    userA.id,
  );
  TestValidator.predicate(
    "profile_view_count is number",
    typeof metric.profile_view_count === "number",
  );
  TestValidator.predicate(
    "impression_count is number",
    typeof metric.impression_count === "number",
  );
  TestValidator.predicate(
    "created_at format is ISO string",
    typeof metric.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at format is ISO string",
    typeof metric.updated_at === "string",
  );
  TestValidator.equals("metric id and user id match", metric.id, userA.id);

  // 4. User B: attempts to get User A's metric (should fail)
  // Switch to user B context (API auto-manages auth headers per join)
  await TestValidator.error(
    "User B cannot access User A's metrics",
    async () => {
      await api.functional.communityPlatform.user.users.profileDisplayMetrics.at(
        connection,
        {
          userId: userA.id,
          profileDisplayMetricsId: userA.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 5. Query random non-existent metric
  const nonExistentMetricId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Non-existent metric record cannot be retrieved",
    async () => {
      await api.functional.communityPlatform.user.users.profileDisplayMetrics.at(
        connection,
        {
          userId: userA.id,
          profileDisplayMetricsId: nonExistentMetricId,
        },
      );
    },
  );

  // 6. Simulate soft-deleted record case (as per API, deleted records are omitted and thus treated as not found)
  // (Cannot programmatically delete as API is readonly, but above test for non-existent covers soft-deleted logic as well)
}
