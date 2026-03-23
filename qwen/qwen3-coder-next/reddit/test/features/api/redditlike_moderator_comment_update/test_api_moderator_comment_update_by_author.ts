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

export async function test_api_moderator_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    moderatorConnection,
    {
      body: {
        name: `community_${RandomGenerator.alphaNumeric(8)}`,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create post
  const post = await generate_random_reddit_like_member_posts_create(
    moderatorConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        type: "text" as const,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create comment
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      moderatorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 5. Update comment
  const newContent = RandomGenerator.paragraph({ sentences: 4 });
  const updatedComment =
    await api.functional.redditLike.moderator.comments.update(
      moderatorConnection,
      {
        commentId: comment.id,
        body: {
          content: newContent,
        } satisfies IRedditLikeComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 6. Verify comment is updated
  TestValidator.equals("content updated", updatedComment.content, newContent);
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedComment.updated_at).getTime() >
      new Date(updatedComment.created_at).getTime(),
  );
  // 7. Verify thread structure remains unchanged
  TestValidator.equals("post_id unchanged", updatedComment.post.id, post.id);
  TestValidator.equals(
    "parentComment unchanged",
    updatedComment.parentComment,
    comment.parentComment,
  );
  // 8. Verify vote_score remains unchanged
  TestValidator.equals(
    "vote_score unchanged",
    updatedComment.vote_score,
    comment.vote_score,
  );
}
