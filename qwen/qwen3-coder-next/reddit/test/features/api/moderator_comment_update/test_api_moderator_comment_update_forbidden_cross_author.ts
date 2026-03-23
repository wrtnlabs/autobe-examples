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
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_moderator_comment_update_forbidden_cross_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Moderator A (comment author)
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorA = await api.functional.redditLike.auth.moderator.join(
    moderatorAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
      } satisfies IRedditLikeModerator.IJoin,
    },
  );
  typia.assert(moderatorA);
  // 2. Create Moderator B (attempting updater)
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorB = await api.functional.redditLike.auth.moderator.join(
    moderatorBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
      } satisfies IRedditLikeModerator.IJoin,
    },
  );
  typia.assert(moderatorB);
  // 3. Moderator A creates a community
  const community = await api.functional.redditLike.member.communities.create(
    moderatorAConnection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4. Moderator A creates a post
  const post = await api.functional.redditLike.member.posts.create(
    moderatorAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Moderator A creates a comment
  const comment = await api.functional.redditLike.member.posts.comments.create(
    moderatorAConnection,
    {
      postId: post.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);
  // 6. Moderator B attempts to update Moderator A's comment - expect 403 Forbidden
  const updatedContent = RandomGenerator.paragraph({ sentences: 2 });
  await TestValidator.error(
    "moderator cannot update other moderator's comment",
    async () => {
      await api.functional.redditLike.moderator.comments.update(
        moderatorBConnection,
        {
          commentId: comment.id,
          body: {
            content: updatedContent,
          } satisfies IRedditLikeComment.IUpdate,
        },
      );
    },
  );
}
