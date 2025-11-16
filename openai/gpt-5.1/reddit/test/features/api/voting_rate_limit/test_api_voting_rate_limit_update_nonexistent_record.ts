import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingRateLimit";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingRateLimit";

/**
 * Verify that updating a non-existent voting rate limit record fails and does
 * not create new data.
 *
 * Business intent
 *
 * - Platform administrators must not be able to "create" voting rate limit
 *   windows via the update endpoint.
 * - When a platform admin attempts to update a rate limit window that does not
 *   exist (for a given member user), the backend must respond with an error,
 *   and no new record should be created as a side effect.
 *
 * Constraints & available APIs
 *
 * - We can authenticate as a platform admin using
 *   api.functional.auth.platformAdmin.join.
 * - We can list rate limit records for a member user using
 *   api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.index.
 * - We can attempt an update using
 *   api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.update.
 * - We do not have APIs to create member users or to explicitly create/delete
 *   voting rate limit records, so the test must treat the database as
 *   pre-seeded or empty and focus on non-destructive verification.
 *
 * Test strategy
 *
 * 1. Join as a platform administrator and validate the IAuthorized response with
 *    typia.assert so that subsequent calls are authenticated.
 * 2. Choose a random UUID to act as a synthetic memberUserId. Because we cannot
 *    create a member user via available APIs, we treat this ID as an arbitrary
 *    lookup key. The index endpoint is documented to return an empty paginated
 *    list when there are no records, even if the member user does not exist, so
 *    this is safe.
 * 3. Call the index endpoint for this memberUserId and record the initial
 *    pagination.records value from the
 *    IPageICommunityPlatformVotingRateLimit.ISummary response. Validate the
 *    response shape using typia.assert.
 * 4. Generate a second random UUID as votingRateLimitId. Because both IDs are
 *    random and we’re not creating rate limits in this test, the combination
 *    (memberUserId, votingRateLimitId) should not correspond to any existing
 *    row.
 * 5. Construct a syntactically valid ICommunityPlatformVotingRateLimit.IUpdate
 *    payload, setting fields like scope_type, window_start, window_end,
 *    post_votes_count, and comment_votes_count to plausible values.
 * 6. Use TestValidator.error with an async closure to assert that calling the
 *    update endpoint with these IDs and the update payload results in an error
 *    (HttpError or equivalent). Do not assert the numeric status code, only
 *    that an error is thrown.
 * 7. After the failed update attempt, call index again for the same memberUserId
 *    and assert that the pagination.records value is unchanged from the initial
 *    snapshot, proving that the failed update did not create a new record as a
 *    side effect.
 */
export async function test_api_voting_rate_limit_update_nonexistent_record(
  connection: api.IConnection,
) {
  // 1. Authenticate as platform admin
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `admin_${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Prepare synthetic memberUserId and 3. capture initial index state
  const memberUserId = typia.random<string & tags.Format<"uuid">>();
  const initialPage =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.index(
      connection,
      {
        memberUserId,
      },
    );
  typia.assert<IPageICommunityPlatformVotingRateLimit.ISummary>(initialPage);
  const initialRecords = initialPage.pagination.records;

  // 4. Prepare a clearly non-existent votingRateLimitId
  const votingRateLimitId = typia.random<string & tags.Format<"uuid">>();

  // 5. Construct a valid update payload
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
  const updateBody = {
    scope_type: "global",
    window_start: now.toISOString(),
    window_end: later.toISOString(),
    post_votes_count: 0,
    comment_votes_count: 0,
  } satisfies ICommunityPlatformVotingRateLimit.IUpdate;

  // 6. Expect an error when updating non-existent record
  await TestValidator.error(
    "updating non-existent voting rate limit must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.update(
        connection,
        {
          memberUserId,
          votingRateLimitId,
          body: updateBody,
        },
      );
    },
  );

  // 7. Ensure no new record was created as a side effect
  const finalPage =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.index(
      connection,
      {
        memberUserId,
      },
    );
  typia.assert<IPageICommunityPlatformVotingRateLimit.ISummary>(finalPage);

  TestValidator.equals(
    "failed update must not change total records count",
    finalPage.pagination.records,
    initialRecords,
  );
}
