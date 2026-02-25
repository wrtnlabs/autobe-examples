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

export async function test_api_moderator_comment_votes_filtered_by_moderator_and_vote(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving moderator comment votes filtered by moderator ID and vote (+1 or -1), including pagination and data consistency
  // 1. Moderator registration and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        displayName: null,
        bio: null,
        avatarUrl: null,
      },
    },
  );
  typia.assert(moderatorAuthorized);
  moderatorConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // 2. Create a comment vote entity to be voted on by moderator
  const commentVoteRaw =
    await generate_random_community_platform_comment_votes_create(
      moderatorConnection,
      {},
    );
  // commentVoteRaw is ICommunityPlatformCommentVote, augment it with id assertion
  const commentVote = typia.assert(
    commentVoteRaw as ICommunityPlatformCommentVote & {
      id: string;
    },
  );
  // 3. Moderator casts an upvote (+1)
  const moderatorVoteUpRaw =
    await generate_random_community_platform_moderator_comment_votes_moderators_create_moderator_comment_vote(
      moderatorConnection,
      {
        body: {
          commentVoteId: commentVote.id,
          vote: 1,
        },
      },
    );
  const moderatorVoteUp = typia.assert(moderatorVoteUpRaw);
  // 4. Moderator casts a downvote (-1)
  const moderatorVoteDownRaw =
    await generate_random_community_platform_moderator_comment_votes_moderators_create_moderator_comment_vote(
      moderatorConnection,
      {
        body: {
          commentVoteId: commentVote.id,
          vote: -1,
        },
      },
    );
  const moderatorVoteDown = typia.assert(moderatorVoteDownRaw);
  // 5. Test filter by moderatorId and vote = 1
  const filterUpRequest: ICommunityPlatformCommentVoteOfModerator.IRequest = {
    moderatorId: moderatorAuthorized.id,
    vote: 1,
    page: 1,
    limit: 10,
  };
  const filteredUpVotesRaw =
    await api.functional.communityPlatform.moderator.commentVotes.moderators.index(
      moderatorConnection,
      {
        body: filterUpRequest,
      },
    );
  const filteredUpVotes = typia.assert(filteredUpVotesRaw);
  // Validate all returned votes are by moderator and vote = 1
  for (const vote of filteredUpVotes.data) {
    typia.assert(vote.moderator);
    TestValidator.predicate(
      `Filtered vote moderator presence`,
      vote.moderator !== null && vote.moderator !== undefined,
    );
    TestValidator.equals(`Filtered vote value is +1`, vote.vote, 1);
  }
  // 6. Test filter by moderatorId and vote = -1
  const filterDownRequest: ICommunityPlatformCommentVoteOfModerator.IRequest = {
    moderatorId: moderatorAuthorized.id,
    vote: -1,
    page: 1,
    limit: 10,
  };
  const filteredDownVotesRaw =
    await api.functional.communityPlatform.moderator.commentVotes.moderators.index(
      moderatorConnection,
      {
        body: filterDownRequest,
      },
    );
  const filteredDownVotes = typia.assert(filteredDownVotesRaw);
  // Validate all returned votes are by moderator and vote = -1
  for (const vote of filteredDownVotes.data) {
    typia.assert(vote.moderator);
    TestValidator.predicate(
      `Filtered vote moderator presence`,
      vote.moderator !== null && vote.moderator !== undefined,
    );
    TestValidator.equals(`Filtered vote value is -1`, vote.vote, -1);
  }
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "Pagination current page equals requested page",
    filteredUpVotes.pagination.current === filterUpRequest.page,
  );
  TestValidator.predicate(
    "Pagination limit equals requested limit",
    filteredUpVotes.pagination.limit === filterUpRequest.limit,
  );
  TestValidator.predicate(
    "Pagination pages count is non-negative",
    filteredUpVotes.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "Pagination records count is non-negative",
    filteredUpVotes.pagination.records >= 0,
  );
}
