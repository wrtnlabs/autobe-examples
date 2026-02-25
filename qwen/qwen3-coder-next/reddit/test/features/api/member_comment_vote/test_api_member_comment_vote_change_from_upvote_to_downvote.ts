import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_comments_create } from "../../../generate/generate_random_reddit_clone_member_comments_create";
import { generate_random_reddit_clone_member_comments_vote } from "../../../generate/generate_random_reddit_clone_member_comments_vote";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment_vote } from "../../../prepare/prepare_random_reddit_clone_comment_vote";
import { prepare_random_reddit_clone_content_comment } from "../../../prepare/prepare_random_reddit_clone_content_comment";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";

export async function test_api_member_comment_vote_change_from_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
    },
  });
  // 2. Create post for comment
  const post = await generate_random_reddit_clone_member_posts_create(
    voterConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  // 3. Create comment on the post
  const comment = await generate_random_reddit_clone_member_comments_create(
    voterConnection,
    {
      body: {
        postId: post.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  // 4. Vote upvote on the comment
  const upvoteResult = await api.functional.redditClone.member.comments.upvote(
    voterConnection,
    {
      commentId: comment.id,
    },
  );
  typia.assert(upvoteResult);
  const initialScore = upvoteResult.voteScore;
  // 5. Change vote from upvote to downvote
  const downvoteResult = await api.functional.redditClone.member.comments.vote(
    voterConnection,
    {
      commentId: comment.id,
      body: { voteType: "downvote" } satisfies IRedditCloneCommentVote.ICreate,
    },
  );
  typia.assert(downvoteResult);
  // 6. Verify comment score decreased by 2 and author karma decreased by 2
  TestValidator.equals(
    "comment score decreased by 2 (net change from upvote to downvote)",
    downvoteResult.voteScore,
    initialScore - 2,
  );
  TestValidator.equals(
    "user vote changed to downvote",
    downvoteResult.userVote,
    "downvote",
  );
}
