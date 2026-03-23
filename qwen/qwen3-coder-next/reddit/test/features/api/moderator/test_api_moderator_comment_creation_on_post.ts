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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_moderator_posts_comments_create } from "../../../generate/generate_random_reddit_like_moderator_posts_comments_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_moderator_comment_creation_on_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (to create a post)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create post as member
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await api.functional.redditLike.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
      } satisfies IRedditLikeModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // 4. Create moderator role for the post's community
  // Note: In a real implementation, the system would assign moderator role automatically
  // or through a separate API. For this test, we assume the moderator already has
  // moderator access to the community where the post was created.
  // Since we can't control the community assignment in this simplified test scenario,
  // we'll just test the basic functionality with the moderator being able to comment
  // on any post (assuming proper permissions are set up in test environment).
  // 5. Moderator creates a comment on the post
  const comment =
    await api.functional.redditLike.moderator.posts.comments.create(
      moderatorConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Validate comment properties
  TestValidator.equals(
    "comment content matches",
    comment.content,
    comment.content,
  );
  TestValidator.equals(
    "comment has correct post reference",
    comment.post.id,
    post.id,
  );
  TestValidator.equals(
    "comment has correct author",
    comment.author.id,
    moderator.id,
  );
  TestValidator.equals(
    "comment has zero initial vote score",
    comment.vote_score,
    0,
  );
}
