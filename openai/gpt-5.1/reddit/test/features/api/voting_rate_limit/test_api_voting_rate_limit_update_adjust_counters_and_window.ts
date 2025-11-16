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

/**
 * Validate that a platform administrator can adjust an existing voting rate
 * limit window's counters and end timestamp while preserving primary identity
 * and ownership fields.
 *
 * Business flow covered by this test:
 *
 * 1. Platform admin joins via auth.platformAdmin.join, establishing an
 *    authenticated platformAdmin actor context.
 * 2. Admin creates a voting rate limit window for a target member user using
 *    communityPlatform.platformAdmin.memberUsers.votingRateLimits.create.
 *    Because there is no dedicated member-user creation API in scope, the test
 *    uses the memberUser.id embedded in the created
 *    ICommunityPlatformVotingRateLimit as the canonical path parameter source
 *    for subsequent detail and update calls.
 * 3. Admin issues an update call to
 *    communityPlatform.platformAdmin.memberUsers.votingRateLimits.update for
 *    that record, increasing post_votes_count and comment_votes_count and
 *    extending window_end further into the future, while leaving scope_type and
 *    community scope unchanged.
 * 4. The test asserts that the update response reflects the new counter values and
 *    extended window_end, while preserving id and memberUser linkage, and that
 *    updated_at is strictly later than the original updated_at while created_at
 *    remains identical.
 * 5. Finally, the test re-fetches the record via the `at` endpoint to ensure the
 *    persisted representation matches the update response and continues to
 *    satisfy the same invariants.
 */
export async function test_api_voting_rate_limit_update_adjust_counters_and_window(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authenticated context.
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an initial voting rate limit window for a member user.
  // Because we don't have a standalone member user creation endpoint, we rely
  // on the memberUser embedded in the created voting rate limit record.
  const seedMemberUserId = typia.random<string & tags.Format<"uuid">>();

  const now = new Date();
  const windowStart = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
  const windowEnd = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour ahead

  const createBody = {
    scope_type: "global", // arbitrary but consistent string
    community_platform_community_id: null,
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
    allowed_post_votes: 100,
    allowed_comment_votes: 200,
    post_votes_count: 0,
    comment_votes_count: 0,
  } satisfies ICommunityPlatformVotingRateLimit.ICreate;

  const created: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
      connection,
      {
        memberUserId: seedMemberUserId,
        body: createBody,
      },
    );
  typia.assert(created);

  // Use real member user id from the created record for subsequent calls.
  const memberUserId = created.memberUser.id;

  TestValidator.equals(
    "memberUser id from created record used as canonical path memberUserId",
    memberUserId,
    created.memberUser.id,
  );

  // 3. Update the voting rate limit: increase counters and extend window_end.
  const originalUpdatedAt = created.updated_at;
  const originalCreatedAt = created.created_at;
  const originalWindowEnd = created.window_end;

  const updatedPostVotes = created.post_votes_count + 5;
  const updatedCommentVotes = created.comment_votes_count + 7;

  const extendedWindowEndDate = new Date(
    new Date(originalWindowEnd).getTime() + 30 * 60 * 1000,
  ); // +30 minutes

  const updateBody = {
    // keep scope_type and community_platform_community_id unchanged by omitting
    // them from the update payload
    window_end: extendedWindowEndDate.toISOString(),
    post_votes_count: updatedPostVotes,
    comment_votes_count: updatedCommentVotes,
  } satisfies ICommunityPlatformVotingRateLimit.IUpdate;

  const updated: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.update(
      connection,
      {
        memberUserId,
        votingRateLimitId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Validate invariants and updated fields on the update response.
  TestValidator.equals(
    "id remains unchanged after update",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "memberUser id remains unchanged after update",
    updated.memberUser.id,
    created.memberUser.id,
  );

  TestValidator.equals(
    "post_votes_count reflects updated value",
    updated.post_votes_count,
    updatedPostVotes,
  );
  TestValidator.equals(
    "comment_votes_count reflects updated value",
    updated.comment_votes_count,
    updatedCommentVotes,
  );

  TestValidator.equals(
    "window_end extended to new timestamp",
    updated.window_end,
    extendedWindowEndDate.toISOString(),
  );

  TestValidator.equals(
    "created_at remains unchanged after update",
    updated.created_at,
    originalCreatedAt,
  );

  // Compare updated_at timestamps lexicographically (ISO 8601 strings).
  TestValidator.predicate(
    "updated_at is later than prior updated_at",
    updated.updated_at > originalUpdatedAt,
  );

  // 5. Re-fetch via `at` endpoint to ensure persistence and equality.
  const fetched: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.at(
      connection,
      {
        memberUserId,
        votingRateLimitId: created.id,
      },
    );
  typia.assert(fetched);

  TestValidator.equals(
    "fetched record matches updated record (ignoring potential server-only differences)",
    fetched,
    updated,
  );
}
