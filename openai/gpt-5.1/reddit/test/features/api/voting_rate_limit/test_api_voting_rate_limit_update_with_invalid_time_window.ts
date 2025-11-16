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

export async function test_api_voting_rate_limit_update_with_invalid_time_window(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (establish authenticated context)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a valid voting rate limit window
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Construct a valid window: start now, end in +1 hour
  const now = new Date();
  const windowStart: string & tags.Format<"date-time"> =
    now.toISOString() as string & tags.Format<"date-time">;
  const windowEndDate = new Date(now.getTime() + 60 * 60 * 1000);
  const windowEnd: string & tags.Format<"date-time"> =
    windowEndDate.toISOString() as string & tags.Format<"date-time">;

  const createBody = {
    scope_type: "global",
    community_platform_community_id: null,
    window_start: windowStart,
    window_end: windowEnd,
    allowed_post_votes: 100,
    allowed_comment_votes: 200,
    post_votes_count: 0,
    comment_votes_count: 0,
  } satisfies ICommunityPlatformVotingRateLimit.ICreate;

  const created: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
      connection,
      {
        memberUserId,
        body: createBody,
      },
    );
  typia.assert(created);

  // 3. Capture ids
  const votingRateLimitId = created.id;

  // 4. Attempt invalid update: set window_start equal to window_end
  const invalidUpdateBodyEqual = {
    window_start: created.window_end,
    window_end: created.window_end,
  } satisfies ICommunityPlatformVotingRateLimit.IUpdate;

  await TestValidator.error(
    "updating voting rate limit with equal window_start and window_end must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.update(
        connection,
        {
          memberUserId,
          votingRateLimitId,
          body: invalidUpdateBodyEqual,
        },
      );
    },
  );

  // 5. Reload the record and ensure it has not been changed by the failed update
  const reloaded: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.at(
      connection,
      {
        memberUserId,
        votingRateLimitId,
      },
    );
  typia.assert(reloaded);

  // Compare key business fields to ensure immutability after failed update
  TestValidator.equals(
    "id remains the same after failed update",
    reloaded.id,
    created.id,
  );
  TestValidator.equals(
    "scope_type remains unchanged after failed update",
    reloaded.scope_type,
    created.scope_type,
  );
  TestValidator.equals(
    "window_start remains unchanged after failed update",
    reloaded.window_start,
    created.window_start,
  );
  TestValidator.equals(
    "window_end remains unchanged after failed update",
    reloaded.window_end,
    created.window_end,
  );
  TestValidator.equals(
    "post_votes_count remains unchanged after failed update",
    reloaded.post_votes_count,
    created.post_votes_count,
  );
  TestValidator.equals(
    "comment_votes_count remains unchanged after failed update",
    reloaded.comment_votes_count,
    created.comment_votes_count,
  );
}
