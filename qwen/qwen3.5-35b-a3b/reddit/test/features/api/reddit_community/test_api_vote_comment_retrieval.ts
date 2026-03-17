import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import type { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_votes_create } from "../../../generate/generate_random_reddit_community_member_votes_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_vote } from "../../../prepare/prepare_random_reddit_community_vote";

export async function test_api_vote_comment_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: IRedditCommunityMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(auth);
  // 2. Create a post to have a comment target
  const post: IRedditCommunityPost =
    await generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
          post_type: "text" as const,
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment: IRedditCommunityComment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        body: {
          body: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityComment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 4. Cast an upvote on the comment
  const vote: IRedditCommunityVote =
    await generate_random_reddit_community_member_votes_create(
      memberConnection,
      {
        body: {
          vote_type: "upvote" as const,
          target_comment_id: comment.id,
        } satisfies IRedditCommunityVote.ICreate,
      },
    );
  typia.assert(vote);
  // 5. Retrieve the vote record using the vote ID
  const retrievedVote: IRedditCommunityVote =
    await api.functional.redditCommunity.member.votes.at(memberConnection, {
      voteId: vote.id,
    });
  typia.assert(retrievedVote);
  // 6. Validate vote contains correct data
  TestValidator.equals(
    "vote type is upvote",
    retrievedVote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "vote targets correct comment",
    retrievedVote.targetComment?.id,
    comment.id,
  );
  TestValidator.equals(
    "comment author matches vote member",
    retrievedVote.targetComment?.author.id,
    retrievedVote.member.id,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(retrievedVote.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(retrievedVote.updated_at)),
  );
}
