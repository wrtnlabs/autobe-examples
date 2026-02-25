import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommentVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteOfModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_comment_votes_create } from "../../../generate/generate_random_community_platform_comment_votes_create";
import { generate_random_community_platform_moderator_comment_votes_moderators_create_moderator_comment_vote } from "../../../generate/generate_random_community_platform_moderator_comment_votes_moderators_create_moderator_comment_vote";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_comment_vote_of_moderator } from "../../../prepare/prepare_random_community_platform_comment_vote_of_moderator";

export async function test_api_moderator_comment_votes_filtered_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinInput: ICommunityPlatformModerator.IJoin = {
    email: typia.random<string & typia.tags.Format<"email">>(),
    username: RandomGenerator.name(),
    displayName: null,
    bio: null,
    avatarUrl: null,
  };
  const authorizedModerator = await authorize_moderator_join(
    moderatorConnection,
    {
      body: moderatorJoinInput,
    },
  );
  moderatorConnection.headers = {
    Authorization: authorizedModerator.token.access,
  };
  // 2. Create a comment vote entity
  const commentVote =
    await generate_random_community_platform_comment_votes_create(
      moderatorConnection,
      {},
    );
  typia.assert(commentVote);
  // Access commentVote id via type assertion
  const commentVoteId = (commentVote as unknown as { id: string }).id;
  // 3. Cast a moderator vote on created comment vote
  const moderatorCommentVote =
    await generate_random_community_platform_moderator_comment_votes_moderators_create_moderator_comment_vote(
      moderatorConnection,
      {
        body: {
          commentVoteId: commentVoteId,
          vote: 1,
        },
      },
    );
  typia.assert(moderatorCommentVote);
  // 4. Date range filter
  const createdAtFrom = new Date(moderatorCommentVote.createdAt);
  const createdAtTo = new Date();
  createdAtTo.setSeconds(createdAtTo.getSeconds() + 10); // small buffer
  // 5. Query moderator comment votes filtered by date range
  const page = 1;
  const limit = 10;
  const response =
    await api.functional.communityPlatform.moderator.commentVotes.moderators.index(
      moderatorConnection,
      {
        body: {
          createdAtFrom: createdAtFrom.toISOString(),
          createdAtTo: createdAtTo.toISOString(),
          page,
          limit,
        },
      },
    );
  // 6. Validate response structure
  typia.assert(response);
  TestValidator.predicate(
    "pagination current page",
    response.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination page size limit",
    response.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination records",
    response.pagination.records >= 1,
  );
  TestValidator.predicate("pagination pages", response.pagination.pages >= 1);
  // Validate each record
  for (const vote of response.data) {
    // Vote created_at between filter range
    const voteCreatedAt = new Date(vote.created_at);
    TestValidator.predicate(
      "vote createdAt in range",
      voteCreatedAt >= createdAtFrom && voteCreatedAt <= createdAtTo,
    );
    // Each record has commentVote and moderator objects
    TestValidator.predicate(
      "record has commentVote",
      vote.commentVote !== null,
    );
    TestValidator.predicate("record has moderator", vote.moderator !== null);
  }
}
