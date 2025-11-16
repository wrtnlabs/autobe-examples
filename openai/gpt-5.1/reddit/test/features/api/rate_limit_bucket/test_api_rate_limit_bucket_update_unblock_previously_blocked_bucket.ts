import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformRateLimitBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRateLimitBucket";

export async function test_api_rate_limit_bucket_update_unblock_previously_blocked_bucket(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser and obtain authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin#" + RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(admin);

  // 2. Create a rate limit bucket that is already blocked
  const now = new Date();
  const nowIso = now.toISOString();
  const futureBlockedUntil = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString(); // +1 hour

  const createBody = {
    scope: "post_creation",
    bucket_key: `user:${RandomGenerator.alphaNumeric(8)}`,
    max_actions: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    window_seconds: 60 as number & tags.Type<"int32"> & tags.Minimum<1>,
    current_count: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    window_start_at: nowIso,
    blocked_until: futureBlockedUntil,
    metadata: JSON.stringify({ reason: "manual block for test" }),
  } satisfies ICommunityPlatformRateLimitBucket.ICreate;

  const createdBucket: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformRateLimitBucket>(createdBucket);

  // Basic logical validations on initial blocked state
  await TestValidator.predicate(
    "created bucket should start blocked with non-null blocked_until",
    async () =>
      createdBucket.blocked_until !== null &&
      createdBucket.blocked_until !== undefined,
  );

  await TestValidator.predicate(
    "created bucket current_count should be at least max_actions",
    async () => createdBucket.current_count >= createdBucket.max_actions,
  );

  // 3. Update the bucket to unblock it and reset counters
  const newWindowStart = new Date().toISOString();

  const updateBody = {
    current_count: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    window_start_at: newWindowStart,
    blocked_until: null,
  } satisfies ICommunityPlatformRateLimitBucket.IUpdate;

  const updatedBucket: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.update(
      connection,
      {
        rateLimitBucketId: createdBucket.id,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformRateLimitBucket>(updatedBucket);

  // 4. Validate that identifying configuration fields remain unchanged
  TestValidator.equals(
    "scope should remain unchanged after unblocking update",
    updatedBucket.scope,
    createdBucket.scope,
  );

  TestValidator.equals(
    "bucket_key should remain unchanged after unblocking update",
    updatedBucket.bucket_key,
    createdBucket.bucket_key,
  );

  TestValidator.equals(
    "max_actions should remain unchanged after unblocking update",
    updatedBucket.max_actions,
    createdBucket.max_actions,
  );

  TestValidator.equals(
    "window_seconds should remain unchanged after unblocking update",
    updatedBucket.window_seconds,
    createdBucket.window_seconds,
  );

  // 5. Validate that the block has been cleared and counters reset
  TestValidator.equals(
    "blocked_until should be cleared (null) after unblocking update",
    updatedBucket.blocked_until,
    null,
  );

  TestValidator.equals(
    "current_count should be reset to 0 after unblocking update",
    updatedBucket.current_count,
    0,
  );

  await TestValidator.predicate(
    "window_start_at should be defined after unblocking update",
    async () =>
      updatedBucket.window_start_at !== null &&
      updatedBucket.window_start_at !== undefined,
  );

  // 6. Validate updated_at is later than before
  await TestValidator.predicate(
    "updated_at should be later after unblocking update",
    async () =>
      new Date(updatedBucket.updated_at).getTime() >=
      new Date(createdBucket.updated_at).getTime(),
  );
}
