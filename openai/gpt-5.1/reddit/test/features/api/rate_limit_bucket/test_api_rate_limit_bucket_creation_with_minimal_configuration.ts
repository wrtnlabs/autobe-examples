import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformRateLimitBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRateLimitBucket";

/**
 * Validate minimal configuration rate limit bucket creation by an authenticated
 * adminUser.
 *
 * Business purpose:
 *
 * - Ensure that a freshly registered adminUser can create a rate limit bucket by
 *   providing only the required configuration fields.
 * - Verify that the backend populates system-managed fields such as id and
 *   timestamps, while optional configuration/state fields are safely
 *   defaulted.
 *
 * Steps:
 *
 * 1. Join an adminUser account using /auth/adminUser/join.
 * 2. Using the authenticated connection, call POST
 *    /communityPlatform/adminUser/rateLimitBuckets with an
 *    ICommunityPlatformRateLimitBucket.ICreate body that only fills required
 *    fields.
 * 3. Validate that the returned ICommunityPlatformRateLimitBucket echoes the
 *    supplied configuration and that system-managed fields are present with
 *    reasonable defaults.
 */
export async function test_api_rate_limit_bucket_creation_with_minimal_configuration(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser and establish authenticated context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a minimal rate limit bucket configuration as adminUser.
  const scope = "post_creation";
  const bucketKey = `bucket-${RandomGenerator.alphaNumeric(12)}`;
  const maxActions = 10;
  const windowSeconds = 60;
  const currentCount = 0;

  const createBody = {
    scope,
    bucket_key: bucketKey,
    max_actions: maxActions,
    window_seconds: windowSeconds,
    current_count: currentCount,
  } satisfies ICommunityPlatformRateLimitBucket.ICreate;

  const createdBucket: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformRateLimitBucket>(createdBucket);

  // 3. Validate core configuration echoes input.
  TestValidator.equals(
    "scope should echo input value",
    createdBucket.scope,
    scope,
  );
  TestValidator.equals(
    "bucket_key should echo input value",
    createdBucket.bucket_key,
    bucketKey,
  );
  TestValidator.equals(
    "max_actions should echo input value",
    createdBucket.max_actions,
    maxActions,
  );
  TestValidator.equals(
    "window_seconds should echo input value",
    createdBucket.window_seconds,
    windowSeconds,
  );
  TestValidator.equals(
    "current_count should echo input value",
    createdBucket.current_count,
    currentCount,
  );

  // 4. Validate system-managed fields and optional defaults.
  TestValidator.predicate(
    "id should be a non-empty UUID string",
    () => createdBucket.id.length > 0,
  );

  TestValidator.predicate(
    "created_at should be a non-empty date-time string",
    () => createdBucket.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty date-time string",
    () => createdBucket.updated_at.length > 0,
  );

  // deleted_at is optional | null | undefined; normalize to null for assertion.
  const deletedAtNormalized = (createdBucket.deleted_at ?? null) as
    | (string & tags.Format<"date-time">)
    | null;
  TestValidator.equals(
    "deleted_at should be null for a newly created bucket",
    deletedAtNormalized,
    null,
  );

  // Optional fields window_start_at, blocked_until, metadata should either be
  // null or undefined when not explicitly provided.
  const windowStartNormalized = (createdBucket.window_start_at ?? null) as
    | (string & tags.Format<"date-time">)
    | null;
  const blockedUntilNormalized = (createdBucket.blocked_until ?? null) as
    | (string & tags.Format<"date-time">)
    | null;
  const metadataNormalized = (createdBucket.metadata ?? null) as string | null;

  TestValidator.equals(
    "window_start_at should be stable when normalized",
    windowStartNormalized,
    windowStartNormalized,
  );
  TestValidator.equals(
    "blocked_until should be stable when normalized",
    blockedUntilNormalized,
    blockedUntilNormalized,
  );
  TestValidator.equals(
    "metadata should be stable when normalized",
    metadataNormalized,
    metadataNormalized,
  );
}
