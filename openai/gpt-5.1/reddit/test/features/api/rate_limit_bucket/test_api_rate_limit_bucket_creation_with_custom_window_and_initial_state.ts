import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformRateLimitBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRateLimitBucket";

/**
 * Verify that an adminUser can create a rate limit bucket with customized
 * window configuration and a pre-populated state.
 *
 * Business flow:
 *
 * 1. Register an adminUser via /auth/adminUser/join and establish an authenticated
 *    session (SDK manages Authorization header automatically).
 * 2. Using the authenticated connection, create a rate limit bucket via POST
 *    /communityPlatform/adminUser/rateLimitBuckets with:
 *
 *    - Scope = "comment_creation"
 *    - A subject-specific bucket_key
 *    - Custom max_actions and window_seconds
 *    - Non-zero current_count
 *    - Explicit window_start_at in the recent past
 *    - Blocked_until = null
 *    - Metadata containing a JSON-encoded manual override note
 * 3. Assert that the response reflects exactly the requested configuration and
 *    that created_at/updated_at are set while deleted_at is null.
 */
export async function test_api_rate_limit_bucket_creation_with_custom_window_and_initial_state(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and establish authenticated context
  const joinBody = {
    username: `admin_${RandomGenerator.alphabets(8)}`,
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Adm1n#",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a custom window configuration and seeded state
  const maxActions = 50;
  const windowSeconds = 300; // 5-minute window
  const currentCount = 3; // non-zero to represent prior usage

  const now = new Date();
  const pastWindowStart = new Date(now.getTime() - 60 * 1000).toISOString();

  const bucketKey = `user:${adminAuthorized.id}:ip:127.0.0.1`;

  const createBody = {
    scope: "comment_creation",
    bucket_key: bucketKey,
    max_actions: maxActions,
    window_seconds: windowSeconds,
    current_count: currentCount,
    window_start_at: pastWindowStart,
    blocked_until: null,
    metadata: JSON.stringify({
      reason: "manual override for active investigation",
    }),
  } satisfies ICommunityPlatformRateLimitBucket.ICreate;

  const createdBucket: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdBucket);

  // 3. Business assertions: response reflects configured state
  TestValidator.equals(
    "scope matches configured value",
    createdBucket.scope,
    createBody.scope,
  );
  TestValidator.equals(
    "bucket_key matches configured value",
    createdBucket.bucket_key,
    createBody.bucket_key,
  );
  TestValidator.equals(
    "max_actions matches configured value",
    createdBucket.max_actions,
    createBody.max_actions,
  );
  TestValidator.equals(
    "window_seconds matches configured value",
    createdBucket.window_seconds,
    createBody.window_seconds,
  );
  TestValidator.equals(
    "current_count matches configured value",
    createdBucket.current_count,
    createBody.current_count,
  );
  TestValidator.equals(
    "window_start_at matches configured value",
    createdBucket.window_start_at ?? null,
    createBody.window_start_at ?? null,
  );
  TestValidator.equals(
    "blocked_until matches configured value (null)",
    createdBucket.blocked_until ?? null,
    createBody.blocked_until ?? null,
  );
  TestValidator.equals(
    "metadata matches configured JSON note",
    createdBucket.metadata ?? null,
    createBody.metadata ?? null,
  );

  // 4. System-managed timestamps and soft delete
  TestValidator.predicate(
    "created_at is a non-empty ISO timestamp",
    () =>
      typeof createdBucket.created_at === "string" &&
      createdBucket.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a non-empty ISO timestamp",
    () =>
      typeof createdBucket.updated_at === "string" &&
      createdBucket.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active bucket",
    createdBucket.deleted_at ?? null,
    null,
  );
}
