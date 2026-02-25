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

export async function test_api_moderator_post_vote_scores_complex_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
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
  // Test 1: High positive engagement posts
  const highEngagementResponse =
    await api.functional.communityPlatform.moderator.posts.vote_scores.index(
      moderatorConnection,
      {
        body: {
          min_total_score: 50,
          min_upvote_count: 20,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(highEngagementResponse);
  // Test 2: Controversial posts with balanced votes
  const controversialResponse =
    await api.functional.communityPlatform.moderator.posts.vote_scores.index(
      moderatorConnection,
      {
        body: {
          min_upvote_count: 10,
          min_downvote_count: 10,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(controversialResponse);
  // Test 3: Time-bound searches
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const now = new Date().toISOString();
  const timeBoundResponse =
    await api.functional.communityPlatform.moderator.posts.vote_scores.index(
      moderatorConnection,
      {
        body: {
          start_last_updated_at: oneWeekAgo,
          end_last_updated_at: now,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(timeBoundResponse);
  // Test 4: Text search functionality
  const searchResponse =
    await api.functional.communityPlatform.moderator.posts.vote_scores.index(
      moderatorConnection,
      {
        body: {
          search: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Test 5: Combined filters
  const combinedResponse =
    await api.functional.communityPlatform.moderator.posts.vote_scores.index(
      moderatorConnection,
      {
        body: {
          min_total_score: 10,
          max_total_score: 100,
          min_upvote_count: 5,
          max_upvote_count: 50,
          start_last_updated_at: oneWeekAgo,
          end_last_updated_at: now,
          search: RandomGenerator.paragraph({ sentences: 1 }),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    combinedResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is valid",
    combinedResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    combinedResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is valid",
    combinedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    combinedResponse.pagination.pages >= 0,
  );
}
