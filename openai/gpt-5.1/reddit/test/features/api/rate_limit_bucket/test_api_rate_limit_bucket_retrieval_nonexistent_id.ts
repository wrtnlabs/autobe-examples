import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformRateLimitBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRateLimitBucket";

export async function test_api_rate_limit_bucket_retrieval_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Arrange: register an adminUser to obtain admin context (SDK will set token)
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

  // 2. Arrange: create a real rate limit bucket to confirm happy-path behavior
  const createBody = {
    scope: "post_creation",
    bucket_key: RandomGenerator.alphaNumeric(16),
    max_actions: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    window_seconds: 60 as number & tags.Type<"int32"> & tags.Minimum<1>,
    current_count: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    window_start_at: null,
    blocked_until: null,
    metadata: null,
  } satisfies ICommunityPlatformRateLimitBucket.ICreate;

  const existingBucket: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.create(
      connection,
      { body: createBody },
    );
  typia.assert(existingBucket);

  // Sanity check: we can retrieve the existing bucket successfully
  const fetchedExisting: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.at(
      connection,
      { rateLimitBucketId: existingBucket.id },
    );
  typia.assert(fetchedExisting);
  TestValidator.equals(
    "existing bucket retrieval should match created id",
    fetchedExisting.id,
    existingBucket.id,
  );

  // 3. Act: call at() with a syntactically valid but non-existent UUID
  // We ensure non-existence by drawing a fresh random uuid until it differs
  // from the existing bucket id. In practice a single draw is overwhelmingly
  // likely to be distinct, but we keep a trivial guard for determinism.
  let nonexistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonexistentId === existingBucket.id) {
    nonexistentId = typia.random<string & tags.Format<"uuid">>();
  }

  // 4. Assert: calling GET with the non-existent id should result in an error.
  // We do not assert on specific HTTP status codes or error payload shapes,
  // only that an error is thrown and a bucket is not returned.
  await TestValidator.error(
    "non-existent bucket id must not succeed",
    async () => {
      await api.functional.communityPlatform.adminUser.rateLimitBuckets.at(
        connection,
        { rateLimitBucketId: nonexistentId },
      );
    },
  );
}
