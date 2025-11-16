import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformRateLimitBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRateLimitBucket";

export async function test_api_rate_limit_bucket_update_configuration_tighten_limits(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser and establish authenticated context
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

  // 2. Create an initial, permissive rate limit bucket
  const initialScope = "post_creation";
  const initialBucketKey = RandomGenerator.alphaNumeric(16);

  const createBody = {
    scope: initialScope,
    bucket_key: initialBucketKey,
    max_actions: 100,
    window_seconds: 3600,
    current_count: 0,
    window_start_at: null,
    blocked_until: null,
    metadata: JSON.stringify({ stage: "initial-permissive" }),
  } satisfies ICommunityPlatformRateLimitBucket.ICreate;

  const createdBucket: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdBucket);

  // Capture original configuration for later comparison
  const originalMaxActions = createdBucket.max_actions;
  const originalWindowSeconds = createdBucket.window_seconds;
  const originalCreatedAt = createdBucket.created_at;
  const originalUpdatedAt = createdBucket.updated_at;
  const originalCurrentCount = createdBucket.current_count;

  // 3. Tighten configuration via update (lower max_actions and window_seconds, update metadata)
  const tightenedMaxActions = 20;
  const tightenedWindowSeconds = 600;
  const tightenedMetadata = JSON.stringify({ stage: "tightened" });

  const updateBody = {
    max_actions: tightenedMaxActions,
    window_seconds: tightenedWindowSeconds,
    metadata: tightenedMetadata,
  } satisfies ICommunityPlatformRateLimitBucket.IUpdate;

  const updatedBucket: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.update(
      connection,
      {
        rateLimitBucketId: createdBucket.id,
        body: updateBody,
      },
    );
  typia.assert(updatedBucket);

  // 4. Validate that configuration was tightened correctly
  TestValidator.equals(
    "bucket id should remain unchanged after update",
    createdBucket.id,
    updatedBucket.id,
  );

  TestValidator.equals(
    "scope should remain unchanged after update",
    createdBucket.scope,
    updatedBucket.scope,
  );

  TestValidator.equals(
    "bucket_key should remain unchanged after update",
    createdBucket.bucket_key,
    updatedBucket.bucket_key,
  );

  TestValidator.equals(
    "max_actions should be tightened to expected value",
    tightenedMaxActions,
    updatedBucket.max_actions,
  );

  TestValidator.predicate(
    "max_actions should be reduced compared to original configuration",
    updatedBucket.max_actions < originalMaxActions,
  );

  TestValidator.equals(
    "window_seconds should be tightened to expected value",
    tightenedWindowSeconds,
    updatedBucket.window_seconds,
  );

  TestValidator.predicate(
    "window_seconds should be reduced compared to original configuration",
    updatedBucket.window_seconds < originalWindowSeconds,
  );

  TestValidator.equals(
    "metadata should reflect tightened configuration flag",
    tightenedMetadata,
    updatedBucket.metadata,
  );

  TestValidator.equals(
    "current_count should remain unchanged when not updated",
    originalCurrentCount,
    updatedBucket.current_count,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    originalCreatedAt,
    updatedBucket.created_at,
  );

  TestValidator.predicate(
    "updated_at should be the same or later than original updated_at",
    updatedBucket.updated_at >= originalUpdatedAt,
  );

  TestValidator.predicate(
    "current_count must stay non-negative",
    updatedBucket.current_count >= 0,
  );

  TestValidator.predicate(
    "max_actions stays within non-negative constraint",
    updatedBucket.max_actions >= 0,
  );

  TestValidator.predicate(
    "window_seconds stays within positive constraint",
    updatedBucket.window_seconds >= 1,
  );
}
