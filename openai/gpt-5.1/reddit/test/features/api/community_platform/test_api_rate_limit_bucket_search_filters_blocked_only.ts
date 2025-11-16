import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformRateLimitBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRateLimitBucket";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformRateLimitBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformRateLimitBucket";

/**
 * Verify that rate limit bucket search honors the `blocked_only` filter.
 *
 * Business goal:
 *
 * - Ensure that administrative search over community_platform_rate_limit_buckets
 *   can reliably surface only actively blocked buckets when `blocked_only` is
 *   enabled, and that disabling the filter returns both blocked and unblocked
 *   buckets.
 *
 * Test steps:
 *
 * 1. Register a new adminUser account via POST /auth/adminUser/join and rely on
 *    the SDK to attach the Authorization header to the connection.
 * 2. Using the authenticated admin context, create two rate limit buckets via POST
 *    /communityPlatform/adminUser/rateLimitBuckets:
 *
 *    - Bucket A: same scope as B, but unblocked (blocked_until = null).
 *    - Bucket B: same scope, but explicitly blocked (blocked_until in future).
 * 3. Search with PATCH /communityPlatform/adminUser/rateLimitBuckets using
 *    ICommunityPlatformRateLimitBucket.IRequest where:
 *
 *    - Scopes contains the shared scope.
 *    - Blocked_only is true.
 * 4. Assert that the blocked-only search:
 *
 *    - Includes Bucket B.
 *    - Excludes Bucket A.
 * 5. Search again with blocked_only set to false (same other filters).
 * 6. Assert that this broader search includes both Bucket A and Bucket B,
 *    demonstrating that `blocked_only` is the differentiating factor.
 */
export async function test_api_rate_limit_bucket_search_filters_blocked_only(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser account and obtain an authorized context.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Seed rate limit buckets under a shared scope.
  const sharedScope = "test_scope_blocked_filter";

  // Helper to generate a recent ISO timestamp for window_start_at.
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 1000).toISOString();

  // Unblocked bucket (Bucket A): blocked_until = null, current_count below max.
  const bucketACreateBody = {
    scope: sharedScope,
    bucket_key: `bucket-A-${RandomGenerator.alphaNumeric(8)}`,
    max_actions: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    window_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    current_count: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    window_start_at: windowStart,
    blocked_until: null,
    metadata: null,
  } satisfies ICommunityPlatformRateLimitBucket.ICreate;

  const bucketA =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.create(
      connection,
      { body: bucketACreateBody },
    );
  typia.assert<ICommunityPlatformRateLimitBucket>(bucketA);

  // Blocked bucket (Bucket B): blocked_until in the future.
  const futureBlockedUntil = new Date(
    now.getTime() + 5 * 60 * 1000,
  ).toISOString();

  const bucketBCreateBody = {
    scope: sharedScope,
    bucket_key: `bucket-B-${RandomGenerator.alphaNumeric(8)}`,
    max_actions: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    window_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    current_count: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    window_start_at: windowStart,
    blocked_until: futureBlockedUntil,
    metadata: null,
  } satisfies ICommunityPlatformRateLimitBucket.ICreate;

  const bucketB =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.create(
      connection,
      { body: bucketBCreateBody },
    );
  typia.assert<ICommunityPlatformRateLimitBucket>(bucketB);

  // 3. Search with blocked_only = true for the shared scope.
  const blockedOnlyRequestBody = {
    scopes: [sharedScope],
    bucket_key: null,
    bucket_key_prefix: null,
    window_started_from: null,
    window_started_to: null,
    blocked_only: true,
    near_limit_only: null,
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_by: null,
    sort_direction: null,
  } satisfies ICommunityPlatformRateLimitBucket.IRequest;

  const blockedOnlyPage =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.index(
      connection,
      { body: blockedOnlyRequestBody },
    );
  typia.assert<IPageICommunityPlatformRateLimitBucket.ISummary>(
    blockedOnlyPage,
  );

  // 4. Validate that blocked_only=true includes Bucket B and excludes Bucket A.
  const blockedOnlyData = blockedOnlyPage.data;

  const foundBlocked = blockedOnlyData.find(
    (summary) => summary.id === bucketB.id,
  );
  const foundUnblocked = blockedOnlyData.find(
    (summary) => summary.id === bucketA.id,
  );

  TestValidator.predicate(
    "blocked_only=true: blocked bucket is present in result",
    foundBlocked !== undefined,
  );

  TestValidator.predicate(
    "blocked_only=true: unblocked bucket is absent from result",
    foundUnblocked === undefined,
  );

  // 5. Search again with blocked_only = false (same filters otherwise).
  const allBucketsRequestBody = {
    scopes: [sharedScope],
    bucket_key: null,
    bucket_key_prefix: null,
    window_started_from: null,
    window_started_to: null,
    blocked_only: false,
    near_limit_only: null,
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_by: null,
    sort_direction: null,
  } satisfies ICommunityPlatformRateLimitBucket.IRequest;

  const allBucketsPage =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.index(
      connection,
      { body: allBucketsRequestBody },
    );
  typia.assert<IPageICommunityPlatformRateLimitBucket.ISummary>(allBucketsPage);

  const allData = allBucketsPage.data;

  const foundBlockedInAll = allData.find(
    (summary) => summary.id === bucketB.id,
  );
  const foundUnblockedInAll = allData.find(
    (summary) => summary.id === bucketA.id,
  );

  TestValidator.predicate(
    "blocked_only=false: blocked bucket is present in result",
    foundBlockedInAll !== undefined,
  );

  TestValidator.predicate(
    "blocked_only=false: unblocked bucket is present in result",
    foundUnblockedInAll !== undefined,
  );
}
