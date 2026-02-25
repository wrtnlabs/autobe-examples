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

export async function test_api_moderator_comment_votes_moderator_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a paginated list of all moderator comment votes without filters.
  // 1. Moderator registration and authorization
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = moderatorAuth.token.access;
  // 2. Create a comment vote entity
  const commentVoteRaw =
    await generate_random_community_platform_comment_votes_create(
      moderatorConnection,
      {},
    );
  // Cast commentVoteRaw to ISummary to access id
  const commentVote =
    typia.assert<ICommunityPlatformCommentVote.ISummary>(commentVoteRaw);
  // 3. Moderator casts a vote on the comment vote
  const moderatorVoteRaw =
    await generate_random_community_platform_moderator_comment_votes_moderators_create_moderator_comment_vote(
      moderatorConnection,
      {
        body: {
          commentVoteId: commentVote.id,
          vote: 1,
        },
      },
    );
  const moderatorVote =
    typia.assert<ICommunityPlatformCommentVoteOfModerator>(moderatorVoteRaw);
  // 4. Retrieve paginated list of moderator votes on comment votes with no filters
  const indexResponseRaw =
    await api.functional.communityPlatform.moderator.commentVotes.moderators.index(
      moderatorConnection,
      { body: {} },
    );
  const indexResponse =
    typia.assert<IPageICommunityPlatformCommentVoteOfModerator.ISummary>(
      indexResponseRaw,
    );
  // 5. Validate pagination structure
  TestValidator.predicate(
    "pagination current page is at least 1",
    indexResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is at least 1",
    indexResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    indexResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is a non-negative integer",
    indexResponse.pagination.pages >= 0,
  );
  // 6. Validate total count is logical according to list length
  TestValidator.predicate(
    "total records is >= number of returned data items",
    indexResponse.pagination.records >= indexResponse.data.length,
  );
  // 7. Validate that the vote cast earlier is contained in the data list
  const foundVote = indexResponse.data.find(
    (v: ICommunityPlatformCommentVoteOfModerator.ISummary) =>
      v.id === moderatorVote.id,
  );
  TestValidator.predicate(
    "found the created moderator vote",
    foundVote !== undefined,
  );
  if (foundVote) {
    // Validate vote value
    TestValidator.equals(
      "vote value matches",
      foundVote.vote,
      moderatorVote.vote,
    );
    // Validate moderator id presence (non-null object)
    TestValidator.predicate(
      "moderator id presence",
      typeof foundVote.moderator === "object" && foundVote.moderator !== null,
    );
    // Validate commentVote id presence (non-null object)
    TestValidator.predicate(
      "commentVote id presence",
      typeof foundVote.commentVote === "object" &&
        foundVote.commentVote !== null,
    );
  }
}
