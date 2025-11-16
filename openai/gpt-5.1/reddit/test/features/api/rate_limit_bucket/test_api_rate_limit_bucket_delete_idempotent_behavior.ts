import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformRateLimitBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRateLimitBucket";

/**
 * Validate adminUser-facing delete semantics for rate limit buckets.
 *
 * Business goal: Ensure that an administrative actor (adminUser) can delete a
 * specific rate limit bucket and that a repeated delete call behaves in a
 * predictable, idempotent-like manner: the first delete removes the bucket (or
 * marks it deleted) and the second delete yields a not-found style HTTP error
 * without any side effects.
 *
 * Scenario overview:
 *
 * 1. Bootstrap an adminUser session using POST /auth/adminUser/join.
 *
 *    - Use typia.random<ICommunityPlatformAdminUserJoin.IRequest>() to generate a
 *         structurally valid join payload.
 *    - The join() SDK function will set the Authorization header on the provided
 *         connection automatically via the token in the
 *         ICommunityPlatformAdminuser.IAuthorized response.
 * 2. Create a rate limit bucket via POST
 *    /communityPlatform/adminUser/rateLimitBuckets using the
 *    api.functional.communityPlatform.adminUser.rateLimitBuckets.create
 *    function.
 *
 *    - Build a realistic ICommunityPlatformRateLimitBucket.ICreate body: scope,
 *         bucket_key, max_actions, window_seconds, current_count and optional
 *         window_start_at / blocked_until / metadata.
 *    - Call the create() function with await and typia.assert() the
 *         ICommunityPlatformRateLimitBucket response.
 * 3. Perform the first delete call using
 *    api.functional.communityPlatform.adminUser.rateLimitBuckets.erase with the
 *    created bucket id as rateLimitBucketId.
 *
 *    - This call returns void; just await it to ensure the server processed the
 *         delete.
 *    - This first call is the successful deletion path and must not be wrapped in
 *         TestValidator.error(). Any HttpError here should be allowed to fail
 *         the test.
 * 4. Perform the second delete call with the same rateLimitBucketId and assert
 *    that a not-found-like HTTP error is raised.
 *
 *    - Wrap the second delete in await TestValidator.httpError(), passing an
 *         expected status code of 404 to represent the not-found semantics
 *         described in the erase() JSDoc.
 *    - The callback passed to TestValidator.httpError() must be async and must
 *         itself await the erase() call so that thrown HttpError is properly
 *         captured.
 *
 * Constraints and conventions:
 *
 * - Use only the imports provided by the template: ArrayUtil, RandomGenerator,
 *   TestValidator, typia, tags, and api.
 * - Use ICommunityPlatformAdminUserJoin.IRequest for the join payload,
 *   ICommunityPlatformAdminuser.IAuthorized for the join response, and
 *   ICommunityPlatformRateLimitBucket.ICreate /
 *   ICommunityPlatformRateLimitBucket for bucket creation/inspection.
 * - Always call typia.assert(response) on non-void API responses.
 * - Do not touch connection.headers directly; rely on the join() SDK to manage
 *   Authorization.
 * - Always use await for every API call and for TestValidator.httpError when
 *   using an async callback.
 * - Implement all logic inside the given exported function without additional
 *   top-level helpers or imports.
 */
export async function test_api_rate_limit_bucket_delete_idempotent_behavior(
  connection: api.IConnection,
) {
  // 1. Bootstrap an adminUser session via join
  const adminJoinBody =
    typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a rate limit bucket to be deleted
  const createBody = {
    scope: "post_creation",
    bucket_key: RandomGenerator.alphaNumeric(16),
    max_actions: 10,
    window_seconds: 60,
    current_count: 0,
    window_start_at: null,
    blocked_until: null,
    metadata: null,
  } satisfies ICommunityPlatformRateLimitBucket.ICreate;

  const createdBucket: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdBucket);

  // 3. First delete should succeed without error
  await api.functional.communityPlatform.adminUser.rateLimitBuckets.erase(
    connection,
    {
      rateLimitBucketId: createdBucket.id,
    },
  );

  // 4. Second delete should yield a not-found HTTP error (404)
  await TestValidator.httpError(
    "second erase should be not-found",
    404,
    async () => {
      await api.functional.communityPlatform.adminUser.rateLimitBuckets.erase(
        connection,
        {
          rateLimitBucketId: createdBucket.id,
        },
      );
    },
  );
}
