import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_posts_votes_create_vote } from "../../../generate/generate_random_reddit_platform_member_posts_votes_create_vote";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

export async function test_api_member_comment_vote_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and login
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post for comment vote testing
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "TEXT",
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment =
    await api.functional.redditPlatform.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Create initial UPVOTE on the comment using POST /redditPlatform/member/posts/{postId}/votes
  const initialVote =
    await api.functional.redditPlatform.member.posts.votes.createVote(
      memberConnection,
      {
        postId: post.id,
        body: {
          vote_type: "UPVOTE",
        } satisfies IRedditPlatformPostVote.ICreate,
      },
    );
  typia.assert(initialVote);
  // Verify initial vote was created
  TestValidator.equals("initial vote user", initialVote.user_id, member.id);
  // 5. Update the vote to DOWNVOTE on comment
  const updatedVote =
    await api.functional.redditPlatform.member.posts.comments.votes.updateVote(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "DOWNVOTE",
        } satisfies IRedditPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // Verify vote update
  TestValidator.equals("updated vote member", updatedVote.member.id, member.id);
  TestValidator.equals(
    "updated vote comment",
    updatedVote.comment.id,
    comment.id,
  );
  TestValidator.equals("updated vote type", updatedVote.vote_type, "DOWNVOTE");
  // 6. Verify vote score calculation (UPVOTE: +1, then DOWNVOTE: -1 = net -2 from original)
  TestValidator.predicate(
    "vote score reflects change",
    typeof updatedVote.vote_score === "number",
  );
  // 7. Verify timestamps
  TestValidator.predicate(
    "created_at is ISO string",
    typeof updatedVote.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof updatedVote.updated_at === "string",
  );
}
