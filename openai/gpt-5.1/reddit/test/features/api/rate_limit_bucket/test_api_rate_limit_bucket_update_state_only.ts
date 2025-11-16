import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformRateLimitBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRateLimitBucket";

/**
 * Validate state-only updates of a rate limit bucket by an adminUser.
 *
 * This scenario ensures that an authenticated adminUser can adjust live runtime
 * state of a rate limit bucket (counters and blocking timestamps) via the PUT
 * /communityPlatform/adminUser/rateLimitBuckets/{rateLimitBucketId} endpoint,
 * without altering the bucket's core configuration such as scope, bucket_key,
 * max_actions, and window_seconds.
 *
 * Business flow:
 *
 * 1. Join as a new adminUser using /auth/adminUser/join, which also installs the
 *    admin JWT token into the shared connection.
 * 2. Create a fresh rate limit bucket using POST
 *    /communityPlatform/adminUser/rateLimitBuckets with a well-formed
 *    ICommunityPlatformRateLimitBucket.ICreate payload (non-negative
 *    max_actions, positive window_seconds, initial current_count = 0, no block
 *    and no window_start_at).
 * 3. Capture the returned ICommunityPlatformRateLimitBucket and store the core
 *    configuration fields plus id.
 * 4. Compute new runtime state values:
 *
 *    - Current_count: increase to some positive value
 *    - Window_start_at: set to now (ISO 8601 date-time)
 *    - Blocked_until: set to a near-future instant (now + N seconds)
 * 5. Call the update endpoint PUT
 *    /communityPlatform/adminUser/rateLimitBuckets/{rateLimitBucketId} with an
 *    ICommunityPlatformRateLimitBucket.IUpdate body that only includes
 *    current_count, window_start_at, and blocked_until.
 * 6. Verify that:
 *
 *    - The response passes typia.assert as ICommunityPlatformRateLimitBucket
 *    - Scope, bucket_key, max_actions, window_seconds, id, created_at remain
 *         unchanged from the original bucket
 *    - Current_count, window_start_at, and blocked_until match the requested new
 *         values (modulo any reasonable server-side rounding tolerance for
 *         timestamps)
 *    - Current_count is still non-negative
 *    - If blocked_until is non-null, it is in the future relative to now
 *    - Deleted_at is still null, indicating the bucket remains active.
 */
export async function test_api_rate_limit_bucket_update_state_only(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser and obtain authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an initial rate limit bucket with stable configuration
  const createBody = {
    scope: "post_creation",
    bucket_key: RandomGenerator.alphaNumeric(16),
    max_actions: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
    >(),
    window_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3600>
    >(),
    current_count: 0,
    window_start_at: null,
    blocked_until: null,
    metadata: null,
  } satisfies ICommunityPlatformRateLimitBucket.ICreate;

  const created: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // Sanity checks on created bucket
  TestValidator.equals(
    "created bucket uses requested scope",
    created.scope,
    createBody.scope,
  );
  TestValidator.equals(
    "created bucket uses requested bucket_key",
    created.bucket_key,
    createBody.bucket_key,
  );
  TestValidator.equals(
    "created bucket uses requested max_actions",
    created.max_actions,
    createBody.max_actions,
  );
  TestValidator.equals(
    "created bucket uses requested window_seconds",
    created.window_seconds,
    createBody.window_seconds,
  );
  TestValidator.equals(
    "created bucket has initial current_count",
    created.current_count,
    createBody.current_count,
  );

  // 3. Prepare new runtime state values
  const newCurrentCount:
    | (number & tags.Type<"int32"> & tags.Minimum<0>)
    | undefined = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
  >();

  const now = new Date();
  const windowStartAt: string & tags.Format<"date-time"> =
    now.toISOString() as string & tags.Format<"date-time">;

  const blockedUntilDate = new Date(now.getTime() + 60_000);
  const blockedUntil: string & tags.Format<"date-time"> =
    blockedUntilDate.toISOString() as string & tags.Format<"date-time">;

  const updateBody = {
    current_count: newCurrentCount,
    window_start_at: windowStartAt,
    blocked_until: blockedUntil,
  } satisfies ICommunityPlatformRateLimitBucket.IUpdate;

  // 4. Call update endpoint with state-only changes
  const updated: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.update(
      connection,
      {
        rateLimitBucketId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5. Validate that core configuration fields remain unchanged
  TestValidator.equals("id must remain unchanged", updated.id, created.id);
  TestValidator.equals(
    "scope must remain unchanged",
    updated.scope,
    created.scope,
  );
  TestValidator.equals(
    "bucket_key must remain unchanged",
    updated.bucket_key,
    created.bucket_key,
  );
  TestValidator.equals(
    "max_actions must remain unchanged",
    updated.max_actions,
    created.max_actions,
  );
  TestValidator.equals(
    "window_seconds must remain unchanged",
    updated.window_seconds,
    created.window_seconds,
  );

  // 6. Validate that state fields changed as expected
  TestValidator.equals(
    "current_count should be updated",
    updated.current_count,
    newCurrentCount,
  );
  TestValidator.equals(
    "window_start_at should be updated",
    updated.window_start_at,
    windowStartAt,
  );
  TestValidator.equals(
    "blocked_until should be updated",
    updated.blocked_until,
    blockedUntil,
  );

  // Ensure current_count is non-negative and respects business rules
  TestValidator.predicate(
    "current_count remains non-negative",
    updated.current_count >= 0,
  );

  // If blocked_until is present, ensure it is in the future relative to now
  if (updated.blocked_until !== null && updated.blocked_until !== undefined) {
    const parsedBlockedUntil = new Date(updated.blocked_until);
    TestValidator.predicate(
      "blocked_until is in the future",
      parsedBlockedUntil.getTime() > now.getTime(),
    );
  }

  // Bucket should remain active (soft-delete not applied)
  TestValidator.equals(
    "bucket remains active (deleted_at null)",
    updated.deleted_at,
    null,
  );
}
