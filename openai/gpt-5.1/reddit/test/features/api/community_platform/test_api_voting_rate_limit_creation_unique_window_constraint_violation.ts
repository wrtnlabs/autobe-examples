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
 * Validate rejection of duplicate voting rate limit windows for a member user.
 *
 * Business goal: Ensure that the platform enforces the unique constraint on
 * voting rate limit windows so that, for a given member user, it is not
 * possible to create two rate-limit windows with the same combination of:
 *
 * - Member user (path parameter memberUserId)
 * - Scope_type
 * - Community_platform_community_id
 * - Window_start
 *
 * High-level steps:
 *
 * 1. Authenticate as a platform admin using the join endpoint.
 * 2. Create an initial voting rate limit window for a randomly chosen member user
 *    with a specific scope_type, community id, and window_start.
 * 3. Attempt to create a second voting rate limit window with the same
 *    memberUserId, scope_type, community id, and window_start.
 * 4. Verify that the second creation attempt fails with an error.
 * 5. List the member user's voting rate limits and verify that at least the
 *    original window exists and that the duplicate attempt did not create an
 *    additional record with the same composite identity.
 */
export async function test_api_voting_rate_limit_creation_unique_window_constraint_violation(
  connection: api.IConnection,
) {
  // 1. Authenticate as a platform admin
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Prepare identifiers and window times for the rate limit
  const memberUserId = typia.random<string & tags.Format<"uuid">>();
  const communityId = typia.random<string & tags.Format<"uuid">>();

  const windowStartDate = new Date();
  const windowEndDate = new Date(windowStartDate.getTime() + 60 * 60 * 1000); // +1 hour
  const window_start = windowStartDate.toISOString();
  const window_end = windowEndDate.toISOString();

  // 3. Create the initial voting rate limit window
  const createBody = {
    scope_type: "community",
    community_platform_community_id: communityId,
    window_start,
    window_end,
    allowed_post_votes: 10,
    allowed_comment_votes: 20,
    post_votes_count: 0,
    comment_votes_count: 0,
  } satisfies ICommunityPlatformVotingRateLimit.ICreate;

  const created =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
      connection,
      {
        memberUserId,
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformVotingRateLimit>(created);

  // 4. Attempt to create a duplicate window (same composite key fields)
  const duplicateBody = {
    scope_type: createBody.scope_type,
    community_platform_community_id: createBody.community_platform_community_id,
    window_start: createBody.window_start,
    window_end: createBody.window_end,
    allowed_post_votes: createBody.allowed_post_votes + 5,
    allowed_comment_votes: createBody.allowed_comment_votes + 5,
    post_votes_count: createBody.post_votes_count,
    comment_votes_count: createBody.comment_votes_count,
  } satisfies ICommunityPlatformVotingRateLimit.ICreate;

  await TestValidator.error(
    "duplicate voting rate limit window creation must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
        connection,
        {
          memberUserId,
          body: duplicateBody,
        },
      );
    },
  );

  // 5. List rate limits and verify only the original window is present for that composite key
  const page =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.index(
      connection,
      { memberUserId },
    );
  typia.assert<IPageICommunityPlatformVotingRateLimit.ISummary>(page);

  // There should be at least one record for this member user
  TestValidator.predicate(
    "rate-limit listing should contain at least one record",
    page.pagination.records >= 1,
  );

  // Ensure that the originally created record appears in the listing
  const matching = page.data.filter((summary) => summary.id === created.id);
  TestValidator.predicate(
    "listing should contain the initially created rate limit window",
    matching.length >= 1,
  );

  // Optionally check that there is at most one window with the same composite key
  const sameComposite = page.data.filter(
    (summary) =>
      summary.memberUser.id === created.memberUser.id &&
      summary.scope_type === createBody.scope_type &&
      summary.community_id === createBody.community_platform_community_id &&
      summary.window_start === createBody.window_start,
  );
  TestValidator.predicate(
    "there must not be more than one rate limit window with the same composite key",
    sameComposite.length <= 1,
  );
}
