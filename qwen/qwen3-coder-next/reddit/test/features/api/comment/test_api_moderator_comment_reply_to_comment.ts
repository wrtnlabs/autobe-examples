import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_moderator_posts_comments_create } from "../../../generate/generate_random_reddit_like_moderator_posts_comments_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_moderator_comment_reply_to_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare: Create member and moderator actors
  const memberConnection: api.IConnection = { host: connection.host };
  const joinMemberBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
  } satisfies IRedditLikeMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: joinMemberBody,
  });
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinModeratorBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(),
  } satisfies IRedditLikeModerator.IJoin;
  await authorize_moderator_join(moderatorConnection, {
    body: joinModeratorBody,
  });
  // 2. Member creates a post
  const postBody = {
    title: RandomGenerator.name(3),
    type: "text" as const,
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikePost.ICreate;
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: postBody,
    },
  );
  typia.assert(post);
  // 3. Member creates an initial comment on the post
  const initialCommentBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeComment.ICreate;
  const initialComment =
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: initialCommentBody,
      },
    );
  typia.assert(initialComment);
  // 4. Moderator replies to the initial comment
  const replyBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parent_comment_id: initialComment.id,
  } satisfies IRedditLikeComment.ICreate;
  const replyComment =
    await api.functional.redditLike.moderator.posts.comments.create(
      moderatorConnection,
      {
        postId: post.id,
        body: replyBody,
      },
    );
  typia.assert(replyComment);
  // 5. Validate reply comment
  TestValidator.equals(
    "reply has correct parent_comment_id",
    replyComment.parentComment?.id,
    initialComment.id,
  );
  TestValidator.equals(
    "reply content matches input",
    replyComment.content,
    replyBody.content,
  );
}
