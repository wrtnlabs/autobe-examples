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

export async function test_api_comment_vote_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // Test the primary success path for upvoting a comment.
  // Member A authenticates, then Member B creates a community, post, and comment.
  // Member A then upvotes the comment and we validate the results.
  // 1. Member A joins (the voter)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // 2. Member B joins (the comment author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 3. Store initial karma of the comment author
  const initialAuthorKarma = author.karma;
  // 4. Member B creates a community
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // 5. Member B creates a text post in the community
  const post = await generate_random_community_member_communities_posts_create(
    authorConnection,
    {
      params: { communityName: community.name },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 6. Member B creates a comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    authorConnection,
    {
      params: { postId: post.id },
      body: {
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(comment);
  // Store initial vote metrics
  const initialVoteScore = comment.voteScore;
  const initialUpvoteCount = comment.upvoteCount;
  // 7. Member A upvotes the comment
  const vote = await generate_random_community_member_comments_vote(
    voterConnection,
    {
      params: { commentId: comment.id },
      body: { vote: 1 },
    },
  );
  typia.assert(vote);
  // 8. Validate vote record
  TestValidator.equals("vote direction is upvote", vote.direction, true);
  TestValidator.equals(
    "vote references correct comment",
    vote.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "vote references correct voter",
    vote.author.id,
    voter.id,
  );
  // 9. Validate comment vote metrics increased
  TestValidator.predicate(
    "comment vote score increased by 1",
    vote.comment.vote_score === initialVoteScore + 1,
  );
  TestValidator.predicate(
    "comment upvote count increased by 1",
    vote.comment.upvote_count === initialUpvoteCount + 1,
  );
}
