import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
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
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

export async function test_api_comment_vote_upvote_initial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (commenter/voter)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  // 2. Create Member B (post creator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  // 3. Member B creates a post
  const post = await generate_random_reddit_community_member_posts_create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        reddit_community_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        text_content: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
      },
    },
  );
  typia.assert(post);
  // 4. Member A creates a comment on the post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberAConnection,
      {
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 5. Member A casts an upvote on the comment
  const votedComment =
    await api.functional.redditCommunity.member.posts.comments.votes.update(
      memberAConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "upvote",
        },
      },
    );
  typia.assert(votedComment);
  // 6. Validate vote score is +1
  TestValidator.equals(
    "vote score is +1 after upvote",
    votedComment.votes_count,
    1,
  );
  // 7. Validate comment structure
  TestValidator.equals("comment ID preserved", votedComment.id, comment.id);
  TestValidator.equals(
    "comment content preserved",
    votedComment.content,
    comment.content,
  );
  TestValidator.equals("post ID preserved", votedComment.post.id, post.id);
  TestValidator.equals(
    "author ID preserved",
    votedComment.author.id,
    memberA.id,
  );
  // 8. Validate timestamps are set
  const createdAt = new Date(votedComment.created_at);
  const updatedAt = new Date(votedComment.updated_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    updatedAt >= createdAt,
  );
  // 9. Verify vote score was properly calculated
  TestValidator.predicate(
    "vote score is positive",
    votedComment.votes_count > 0,
  );
}
