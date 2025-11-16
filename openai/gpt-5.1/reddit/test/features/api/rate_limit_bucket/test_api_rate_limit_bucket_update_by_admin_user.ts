import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformRateLimitBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRateLimitBucket";

export async function test_api_rate_limit_bucket_update_by_admin_user(
  connection: api.IConnection,
) {
  // 1. Join as a brand new adminUser to obtain an authenticated context
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

  // 2. Create an initial rate limit bucket using the adminUser token
  const initialBucketBody = {
    scope: "post_creation",
    bucket_key: `test-bucket-${RandomGenerator.alphaNumeric(8)}`,
    max_actions: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    window_seconds: 60 as number & tags.Type<"int32"> & tags.Minimum<1>,
    current_count: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    window_start_at: new Date().toISOString(),
    blocked_until: null,
    metadata: JSON.stringify({ reason: "initial" }),
  } satisfies ICommunityPlatformRateLimitBucket.ICreate;

  const createdBucket: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.create(
      connection,
      {
        body: initialBucketBody,
      },
    );
  typia.assert(createdBucket);

  // Basic sanity checks on created bucket
  TestValidator.predicate(
    "created bucket has non-empty id",
    (createdBucket.id ?? "").length > 0,
  );
  TestValidator.predicate(
    "created bucket max_actions non-negative",
    createdBucket.max_actions >= 0,
  );
  TestValidator.predicate(
    "created bucket window_seconds positive",
    createdBucket.window_seconds > 0,
  );
  TestValidator.predicate(
    "created bucket current_count non-negative",
    createdBucket.current_count >= 0,
  );

  const originalCreatedAt = createdBucket.created_at;
  const originalUpdatedAt = createdBucket.updated_at;

  // 3. Prepare update body changing several configuration/state fields
  const futureBlockedUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes in the future

  const updatedMaxActionsNumber = createdBucket.max_actions + 5;
  const updatedWindowSecondsNumber = createdBucket.window_seconds + 30;
  const updatedCurrentCountNumber = createdBucket.current_count + 2;

  const updatedMaxActions = updatedMaxActionsNumber satisfies number as number;
  const updatedWindowSeconds =
    updatedWindowSecondsNumber satisfies number as number;
  const updatedCurrentCount =
    updatedCurrentCountNumber satisfies number as number;

  const updateBody = {
    scope: createdBucket.scope,
    bucket_key: createdBucket.bucket_key,
    max_actions: updatedMaxActions,
    window_seconds: updatedWindowSeconds,
    current_count: updatedCurrentCount,
    blocked_until: futureBlockedUntil,
    metadata: JSON.stringify({ reason: "updated", flag: true }),
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

  // 4. Validate immutable fields and updated fields
  TestValidator.equals(
    "bucket id should remain the same after update",
    updatedBucket.id,
    createdBucket.id,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedBucket.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at should be equal or later than original",
    updatedBucket.updated_at >= originalUpdatedAt,
  );

  TestValidator.equals(
    "max_actions should be updated",
    updatedBucket.max_actions,
    updatedMaxActions,
  );

  TestValidator.equals(
    "window_seconds should be updated",
    updatedBucket.window_seconds,
    updatedWindowSeconds,
  );

  TestValidator.equals(
    "current_count should be updated",
    updatedBucket.current_count,
    updatedCurrentCount,
  );

  TestValidator.equals(
    "blocked_until should be updated to future timestamp",
    updatedBucket.blocked_until,
    futureBlockedUntil,
  );

  TestValidator.equals(
    "metadata should be updated",
    updatedBucket.metadata,
    updateBody.metadata,
  );

  // 5. Business rule validations on updated bucket
  TestValidator.predicate(
    "updated max_actions is non-negative",
    updatedBucket.max_actions >= 0,
  );

  TestValidator.predicate(
    "updated window_seconds is positive",
    updatedBucket.window_seconds > 0,
  );

  TestValidator.predicate(
    "updated current_count is non-negative",
    updatedBucket.current_count >= 0,
  );

  if (
    updatedBucket.blocked_until !== null &&
    updatedBucket.blocked_until !== undefined
  ) {
    const blockedUntilTime = new Date(updatedBucket.blocked_until).getTime();
    const nowTime = Date.now();
    TestValidator.predicate(
      "blocked_until should not be in the past",
      blockedUntilTime >= nowTime - 1000,
    );
  }
}
