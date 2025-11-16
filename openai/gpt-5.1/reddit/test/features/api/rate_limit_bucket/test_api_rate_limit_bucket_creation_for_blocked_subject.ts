import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformRateLimitBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRateLimitBucket";

/**
 * Validate that an adminUser can create a manually blocked rate limit bucket.
 *
 * Business goal:
 *
 * - Confirm that an authenticated adminUser can proactively create a rate limit
 *   bucket for a specific subject (e.g., IP or account) in an already-blocked
 *   state.
 * - Ensure that configuration fields like scope, bucket_key, max_actions,
 *   window_seconds, current_count, and temporal fields (window_start_at,
 *   blocked_until) in the created bucket match the admin’s intent.
 *
 * Steps:
 *
 * 1. Register an adminUser using /auth/adminUser/join, obtaining an
 *    ICommunityPlatformAdminuser.IAuthorized response with tokens. The SDK will
 *    automatically set Authorization header on the connection using the
 *    returned token.
 * 2. As this adminUser, call POST /communityPlatform/adminUser/rateLimitBuckets
 *    with an ICommunityPlatformRateLimitBucket.ICreate payload that:
 *
 *    - Uses scope = "login_attempt" to represent a sensitive operation.
 *    - Uses a bucket_key encoding a subject like an IP address.
 *    - Sets max_actions and window_seconds to concrete values (e.g., max_actions=5,
 *         window_seconds=60).
 *    - Sets current_count >= max_actions (e.g., 7) to simulate an exhausted bucket.
 *    - Sets window_start_at to a recent timestamp (a few seconds in the past).
 *    - Sets blocked_until to a future timestamp (e.g., now + 5 minutes).
 *    - Sets metadata to a JSON-encoded string describing the reason for the block.
 * 3. Validate the returned ICommunityPlatformRateLimitBucket via typia.assert and
 *    TestValidator:
 *
 *    - Assert scope, bucket_key, max_actions, window_seconds, and current_count
 *         match what we sent.
 *    - Assert blocked_until is not null/undefined and is in the future relative to
 *         the time we constructed the request.
 *    - Assert window_start_at is not null/undefined and is not in the future.
 *    - Optionally assert created_at <= updated_at to ensure temporal consistency.
 *
 * Limitations:
 *
 * - The scenario draft mentions a GET bucket-by-id endpoint for re-reading
 *   persisted state, but no such SDK function has been provided, so the test
 *   relies solely on the POST response.
 */
export async function test_api_rate_limit_bucket_creation_for_blocked_subject(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and obtain authorized context.
  const joinRequestBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Prepare a blocked rate limit bucket payload.
  const now = new Date();
  const fiveMinutesMs = 5 * 60 * 1000;
  const tenSecondsMs = 10 * 1000;

  const windowStartAt = new Date(now.getTime() - tenSecondsMs).toISOString();
  const blockedUntil = new Date(now.getTime() + fiveMinutesMs).toISOString();

  const scope = "login_attempt";
  const bucketKey = `ip:203.0.113.${Math.floor(Math.random() * 200 + 1)}`;
  const maxActions: number & tags.Type<"int32"> & tags.Minimum<0> =
    5 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const windowSeconds: number & tags.Type<"int32"> & tags.Minimum<1> =
    60 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const currentCount: number & tags.Type<"int32"> & tags.Minimum<0> =
    7 as number & tags.Type<"int32"> & tags.Minimum<0>;

  const bucketCreateBody = {
    scope,
    bucket_key: bucketKey,
    max_actions: maxActions,
    window_seconds: windowSeconds,
    current_count: currentCount,
    window_start_at: windowStartAt,
    blocked_until: blockedUntil,
    metadata: '{"reason":"suspected credential stuffing","source":"e2e_test"}',
  } satisfies ICommunityPlatformRateLimitBucket.ICreate;

  const createdBucket: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.create(
      connection,
      {
        body: bucketCreateBody,
      },
    );
  typia.assert<ICommunityPlatformRateLimitBucket>(createdBucket);

  // 3. Business field validations.

  // Equality checks for basic configuration.
  TestValidator.equals("scope matches request", createdBucket.scope, scope);
  TestValidator.equals(
    "bucket_key matches request",
    createdBucket.bucket_key,
    bucketKey,
  );
  TestValidator.equals(
    "max_actions matches request",
    createdBucket.max_actions,
    maxActions,
  );
  TestValidator.equals(
    "window_seconds matches request",
    createdBucket.window_seconds,
    windowSeconds,
  );
  TestValidator.equals(
    "current_count matches request",
    createdBucket.current_count,
    currentCount,
  );

  // blocked_until must be present and in the future.
  await TestValidator.predicate("blocked_until is set", () =>
    Promise.resolve(
      createdBucket.blocked_until !== null &&
        createdBucket.blocked_until !== undefined,
    ),
  );

  if (
    createdBucket.blocked_until !== null &&
    createdBucket.blocked_until !== undefined
  ) {
    const parsedBlockedUntil = new Date(createdBucket.blocked_until).getTime();
    const requestTime = now.getTime();
    TestValidator.predicate(
      "blocked_until is in the future",
      parsedBlockedUntil > requestTime,
    );
  }

  // window_start_at must be present and not in the future (we set it 10s ago).
  await TestValidator.predicate("window_start_at is set", () =>
    Promise.resolve(
      createdBucket.window_start_at !== null &&
        createdBucket.window_start_at !== undefined,
    ),
  );

  if (
    createdBucket.window_start_at !== null &&
    createdBucket.window_start_at !== undefined
  ) {
    const parsedWindowStartAt = new Date(
      createdBucket.window_start_at,
    ).getTime();
    const requestTime = now.getTime();
    TestValidator.predicate(
      "window_start_at is not in the future",
      parsedWindowStartAt <= requestTime,
    );
  }

  // Temporal consistency: created_at <= updated_at.
  const createdAtMs = new Date(createdBucket.created_at).getTime();
  const updatedAtMs = new Date(createdBucket.updated_at).getTime();

  TestValidator.predicate(
    "created_at is not after updated_at",
    createdAtMs <= updatedAtMs,
  );
}
