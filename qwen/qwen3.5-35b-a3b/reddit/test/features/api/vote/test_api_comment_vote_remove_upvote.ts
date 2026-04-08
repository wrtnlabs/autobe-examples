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

export async function test_api_comment_vote_remove_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (voter)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(memberA);
  // 2. Create Member B (post author)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(memberB);
  // 3. Member B creates a post
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(
      memberBConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "text",
          reddit_community_community_id: communityId,
          text_content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);
  // 4. Member A creates a comment on the post
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberAConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Member A casts an upvote on the comment
  const upvotedComment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.votes.update(
      memberAConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "upvote",
        } satisfies IRedditCommunityCommentVote.IUpdate,
      },
    );
  typia.assert(upvotedComment);
  // 6. Verify upvote was cast (vote_score is +1)
  TestValidator.equals(
    "upvote score should be +1",
    upvotedComment.votes_count,
    1,
  );
  // 7. Member A removes the upvote (vote_type=null)
  const removedComment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.votes.update(
      memberAConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: null,
        } satisfies IRedditCommunityCommentVote.IUpdate,
      },
    );
  typia.assert(removedComment);
  // 8. Verify vote score returns to 0
  TestValidator.equals(
    "vote score after removal should be 0",
    removedComment.votes_count,
    0,
  );
  // 9. Member A casts a new downvote after removal
  const downvotedComment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.votes.update(
      memberAConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "downvote",
        } satisfies IRedditCommunityCommentVote.IUpdate,
      },
    );
  typia.assert(downvotedComment);
  // 10. Verify new vote works (vote_score is -1)
  TestValidator.equals(
    "new vote score after re-voting should be -1",
    downvotedComment.votes_count,
    -1,
  );
}
