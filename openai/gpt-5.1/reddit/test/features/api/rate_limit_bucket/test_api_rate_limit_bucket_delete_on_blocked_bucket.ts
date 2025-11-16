import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformRateLimitBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRateLimitBucket";

export async function test_api_rate_limit_bucket_delete_on_blocked_bucket(
  connection: api.IConnection,
) {
  // 1. Join as adminUser to obtain authorized admin context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a blocked rate limit bucket as this admin
  const now = new Date();
  const windowStart = new Date(now.getTime() - 30 * 1000).toISOString();
  const blockedUntil = new Date(now.getTime() + 60 * 1000).toISOString();

  const createBody = {
    scope: `test_scope_${RandomGenerator.alphabets(8)}`,
    bucket_key: `test_bucket_${RandomGenerator.alphabets(8)}`,
    max_actions: 5,
    window_seconds: 60,
    current_count: 5,
    window_start_at: windowStart,
    blocked_until: blockedUntil,
    metadata: JSON.stringify({ reason: "blocked for testing" }),
  } satisfies ICommunityPlatformRateLimitBucket.ICreate;

  const createdBucket: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdBucket);

  // 3. Verify that the created bucket is actually blocked (blocked_until in the future)
  TestValidator.predicate(
    "blocked_until should be set on created bucket",
    () => {
      return (
        createdBucket.blocked_until !== null &&
        createdBucket.blocked_until !== undefined
      );
    },
  );

  TestValidator.predicate("blocked_until should be in the future", () => {
    const parsedBlockedUntil = new Date(createdBucket.blocked_until!);
    const parsedNow = new Date();
    return parsedBlockedUntil.getTime() > parsedNow.getTime();
  });

  // 4. Delete the blocked bucket
  await api.functional.communityPlatform.adminUser.rateLimitBuckets.erase(
    connection,
    {
      rateLimitBucketId: createdBucket.id,
    },
  );

  // 5. Business-level assertion: reaching this point means deletion completed
  // without error, confirming that deleting a blocked bucket is allowed.
  TestValidator.predicate(
    "blocked bucket deletion should complete without throwing",
    true,
  );
}
