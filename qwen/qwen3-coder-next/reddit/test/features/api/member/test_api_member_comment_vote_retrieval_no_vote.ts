import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVotesSum } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVotesSum";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_member_comment_vote_retrieval_no_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (comment author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA =
    await api.functional.redditLike.auth.member.join(memberAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies DeepPartial<IRedditLikeMember.IJoin>,
    });
  typia.assert(memberA);
  // 2. Create member B (voter)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB =
    await api.functional.redditLike.auth.member.join(memberBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies DeepPartial<IRedditLikeMember.IJoin>,
    });
  typia.assert(memberB);
  // 3. Member A creates a post
  const post =
    await api.functional.redditLike.member.posts.create(memberAConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies DeepPartial<IRedditLikePost.ICreate>,
    });
  typia.assert(post);
  // 4. Member A creates a comment on the post
  const comment =
    await api.functional.redditLike.member.posts.comments.create(
      memberAConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<IRedditLikeComment.ICreate>,
      },
    );
  typia.assert(comment);
  // 5. Member B retrieves vote status (has not voted yet)
  const voteStatus: IRedditLikeCommentVotesSum =
    await api.functional.redditLike.member.comments.vote.at(memberBConnection, {
      commentId: comment.id,
    });
  typia.assert(voteStatus);
  // 6. Verify voteValue is null for member B (no vote)
  TestValidator.equals(
    "member B vote value is null",
    voteStatus.voteValue,
    null,
  );
  // 7. Verify commentScore is 0 (no votes cast)
  TestValidator.equals("comment score is 0", voteStatus.commentScore, 0);
}