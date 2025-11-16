import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformRateLimitBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRateLimitBucket";

export async function test_api_rate_limit_bucket_retrieval_after_creation(
  connection: api.IConnection,
) {
  // 1. Register a fresh adminUser and establish authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    // Plain strong-looking password; satisfies IRequest without extra assertions
    password: "AdminPassword!123",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new rate limit bucket under the adminUser context
  const bucketCreateBody = {
    scope: "post_creation",
    bucket_key: RandomGenerator.alphaNumeric(16),
    max_actions: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    window_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    current_count: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    window_start_at: null,
    blocked_until: null,
    metadata: JSON.stringify({ reason: "e2e-test", actor: "adminUser" }),
  } satisfies ICommunityPlatformRateLimitBucket.ICreate;

  const createdBucket: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.create(
      connection,
      {
        body: bucketCreateBody,
      },
    );
  typia.assert(createdBucket);

  // 3. Retrieve the bucket by id using the adminUser GET endpoint
  const fetchedBucket: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.at(
      connection,
      {
        rateLimitBucketId: createdBucket.id,
      },
    );
  typia.assert(fetchedBucket);

  // 4. Validate configuration fields consistency
  TestValidator.equals(
    "rate limit bucket scope should match between create and get",
    fetchedBucket.scope,
    createdBucket.scope,
  );
  TestValidator.equals(
    "rate limit bucket bucket_key should match between create and get",
    fetchedBucket.bucket_key,
    createdBucket.bucket_key,
  );
  TestValidator.equals(
    "rate limit bucket max_actions should match between create and get",
    fetchedBucket.max_actions,
    createdBucket.max_actions,
  );
  TestValidator.equals(
    "rate limit bucket window_seconds should match between create and get",
    fetchedBucket.window_seconds,
    createdBucket.window_seconds,
  );
  TestValidator.equals(
    "rate limit bucket current_count should match between create and get",
    fetchedBucket.current_count,
    createdBucket.current_count,
  );

  // 5. Validate timestamps and soft-delete metadata
  TestValidator.predicate(
    "created_at should be a non-empty string on fetched bucket",
    fetchedBucket.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string on fetched bucket",
    fetchedBucket.updated_at.length > 0,
  );

  TestValidator.equals(
    "created_at must be stable between create and get",
    fetchedBucket.created_at,
    createdBucket.created_at,
  );

  // deleted_at should be null or undefined on a fresh bucket
  TestValidator.equals(
    "deleted_at should be null or undefined on newly created bucket (fetched)",
    fetchedBucket.deleted_at ?? null,
    null,
  );
  TestValidator.equals(
    "deleted_at should be null or undefined on newly created bucket (created)",
    createdBucket.deleted_at ?? null,
    null,
  );

  // 6. Validate optional diagnostic fields remain consistent
  TestValidator.equals(
    "window_start_at should match between create and get",
    fetchedBucket.window_start_at ?? null,
    createdBucket.window_start_at ?? null,
  );
  TestValidator.equals(
    "blocked_until should match between create and get",
    fetchedBucket.blocked_until ?? null,
    createdBucket.blocked_until ?? null,
  );
  TestValidator.equals(
    "metadata should match between create and get",
    fetchedBucket.metadata ?? null,
    createdBucket.metadata ?? null,
  );
}
