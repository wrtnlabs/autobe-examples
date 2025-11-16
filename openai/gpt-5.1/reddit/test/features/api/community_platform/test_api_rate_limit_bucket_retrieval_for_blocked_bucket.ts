import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformRateLimitBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRateLimitBucket";

export async function test_api_rate_limit_bucket_retrieval_for_blocked_bucket(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a blocked rate limit bucket
  const now = new Date();
  const blockedUntil = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const windowStartAt = now.toISOString();

  const maxActions: number & tags.Type<"int32"> & tags.Minimum<0> =
    5 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const windowSeconds: number & tags.Type<"int32"> & tags.Minimum<1> =
    60 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const currentCount: number & tags.Type<"int32"> & tags.Minimum<0> =
    maxActions as number & tags.Type<"int32"> & tags.Minimum<0>;

  const createBody = {
    scope: "login_attempt",
    bucket_key: `user:${adminAuthorized.username}`,
    max_actions: maxActions,
    window_seconds: windowSeconds,
    current_count: currentCount,
    window_start_at: windowStartAt,
    blocked_until: blockedUntil,
    metadata: JSON.stringify({ reason: "too_many_login_attempts" }),
  } satisfies ICommunityPlatformRateLimitBucket.ICreate;

  const createdBucket: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformRateLimitBucket>(createdBucket);

  // 3. Retrieve the bucket by id
  const retrievedBucket: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.at(
      connection,
      {
        rateLimitBucketId: createdBucket.id,
      },
    );
  typia.assert<ICommunityPlatformRateLimitBucket>(retrievedBucket);

  // 4. Business and consistency assertions
  TestValidator.equals(
    "bucket id should match between create and get",
    retrievedBucket.id,
    createdBucket.id,
  );

  TestValidator.equals(
    "scope should match between create and get",
    retrievedBucket.scope,
    createdBucket.scope,
  );

  TestValidator.equals(
    "bucket_key should match between create and get",
    retrievedBucket.bucket_key,
    createdBucket.bucket_key,
  );

  TestValidator.equals(
    "max_actions should match configured value",
    retrievedBucket.max_actions,
    createBody.max_actions,
  );

  TestValidator.equals(
    "window_seconds should match configured value",
    retrievedBucket.window_seconds,
    createBody.window_seconds,
  );

  TestValidator.equals(
    "current_count should match configured saturated value",
    retrievedBucket.current_count,
    createBody.current_count,
  );

  await TestValidator.predicate(
    "current_count should be greater than or equal to max_actions",
    async () => retrievedBucket.current_count >= retrievedBucket.max_actions,
  );

  TestValidator.equals(
    "blocked_until should match configured future timestamp",
    retrievedBucket.blocked_until,
    createBody.blocked_until,
  );

  if (
    retrievedBucket.blocked_until !== null &&
    retrievedBucket.blocked_until !== undefined
  ) {
    const blockedUntilDate = new Date(retrievedBucket.blocked_until);
    const nowAfterCreation = new Date();
    await TestValidator.predicate(
      "blocked_until should be in the future",
      async () => blockedUntilDate.getTime() > nowAfterCreation.getTime(),
    );
  }

  TestValidator.equals(
    "window_start_at should match configured value",
    retrievedBucket.window_start_at ?? null,
    createBody.window_start_at ?? null,
  );

  TestValidator.equals(
    "metadata should be preserved between create and get",
    retrievedBucket.metadata ?? null,
    createBody.metadata ?? null,
  );

  await TestValidator.predicate(
    "deleted_at should be null or undefined (bucket active)",
    async () =>
      retrievedBucket.deleted_at === null ||
      retrievedBucket.deleted_at === undefined,
  );
}
