import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteScore";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_post_vote_scores_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Test 1: Filter for high engagement posts (total_score > 100)
  const highEngagementResponse =
    await api.functional.communityPlatform.moderator.posts.vote_scores.index(
      moderatorConnection,
      {
        body: {
          min_total_score: 101,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(highEngagementResponse);
  // Test 2: Filter for recently updated posts (within last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentPostsResponse =
    await api.functional.communityPlatform.moderator.posts.vote_scores.index(
      moderatorConnection,
      {
        body: {
          start_last_updated_at: weekAgo,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(recentPostsResponse);
  // Test 3: Filter for posts with high upvote counts and minimal downvotes
  const highUpvoteResponse =
    await api.functional.communityPlatform.moderator.posts.vote_scores.index(
      moderatorConnection,
      {
        body: {
          min_upvote_count: 50,
          max_downvote_count: 5,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(highUpvoteResponse);
  // Test 4: Combined filters - high engagement posts updated recently
  const combinedResponse =
    await api.functional.communityPlatform.moderator.posts.vote_scores.index(
      moderatorConnection,
      {
        body: {
          min_total_score: 101,
          start_last_updated_at: weekAgo,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Validate pagination metadata
  await TestValidator.equals(
    "pagination current page",
    highEngagementResponse.pagination.current,
    1,
  );
  await TestValidator.equals(
    "pagination limit",
    highEngagementResponse.pagination.limit,
    10,
  );
  await TestValidator.predicate(
    "pagination records non-negative",
    highEngagementResponse.pagination.records >= 0,
  );
  await TestValidator.predicate(
    "pagination pages non-negative",
    highEngagementResponse.pagination.pages >= 0,
  );
}
