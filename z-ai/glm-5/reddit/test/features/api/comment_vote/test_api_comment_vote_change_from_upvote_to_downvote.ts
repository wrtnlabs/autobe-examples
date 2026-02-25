import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_comments_vote } from "../../../generate/generate_random_community_member_comments_vote";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_comment_vote } from "../../../prepare/prepare_random_community_comment_vote";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_comment_vote_change_from_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A authenticates (will be the voter)
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {});
  // 2. Member B authenticates (will be the comment author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  // 3. Member B creates a community
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  // 4. Member B creates a post in the community
  const post = await generate_random_community_member_communities_posts_create(
    authorConnection,
    {
      params: { communityName: community.name },
    },
  );
  // 5. Member B creates a comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    authorConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // Track initial author karma (comment starts with 0 votes, no karma impact yet)
  const initialAuthorKarma = author.karma;
  // 6. Member A upvotes the comment
  const upvote = await generate_random_community_member_comments_vote(
    voterConnection,
    {
      params: { commentId: comment.id },
      body: { vote: 1 },
    },
  );
  typia.assert(upvote);
  // Validate upvote: direction should be true (upvote)
  TestValidator.equals("upvote direction", upvote.direction, true);
  // 7. Member A changes vote from upvote to downvote
  const changedVote = await generate_random_community_member_comments_vote(
    voterConnection,
    {
      params: { commentId: comment.id },
      body: { vote: -1 },
    },
  );
  typia.assert(changedVote);
  // 8. Validate the vote change
  // The vote direction should now be false (downvote)
  TestValidator.equals(
    "downvote direction after change",
    changedVote.direction,
    false,
  );
  // The vote ID should be the same (existing record updated)
  TestValidator.equals("vote ID unchanged", changedVote.id, upvote.id);
  // The comment's vote_score should be -1 (0 + 1 - 2 = -1)
  TestValidator.equals(
    "comment vote score",
    changedVote.comment.vote_score,
    -1,
  );
  // The comment's upvote_count should be 0
  TestValidator.equals(
    "comment upvote count",
    changedVote.comment.upvote_count,
    0,
  );
  // The comment's downvote_count should be 1
  TestValidator.equals(
    "comment downvote count",
    changedVote.comment.downvote_count,
    1,
  );
}
