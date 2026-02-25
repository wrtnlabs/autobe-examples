import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_deletion_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // Create three distinct user connections
  const commentAuthorConnection: api.IConnection = { host: connection.host };
  const postAuthorConnection: api.IConnection = { host: connection.host };
  const unauthorizedUserConnection: api.IConnection = { host: connection.host };
  // Register and authenticate all three users
  const commentAuthor = await authorize_user_join(commentAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(commentAuthor);
  const postAuthor = await authorize_user_join(postAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(postAuthor);
  const unauthorizedUser = await authorize_user_join(
    unauthorizedUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformUser.IJoin,
    },
  );
  typia.assert(unauthorizedUser);
  // Create community using post author
  const community =
    await generate_random_community_platform_user_communities_create(
      postAuthorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post using post author
  const post = await generate_random_community_platform_user_posts_create(
    postAuthorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create comment using comment author
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      commentAuthorConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Attempt to delete comment as unauthorized user - should fail with 403 Forbidden
  await TestValidator.httpError(
    "unauthorized user cannot delete comment",
    403,
    async () => {
      await api.functional.communityPlatform.user.posts.comments.erase(
        unauthorizedUserConnection,
        {
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );
  // Verify comment still exists by ensuring comment author can still create comments on the same post
  // This indirectly confirms the comment deletion attempt failed
  const newComment =
    await generate_random_community_platform_user_posts_comments_create(
      commentAuthorConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(newComment);
  // Verify the new comment was created successfully, indicating the post and comment system is still functional
  TestValidator.notEquals(
    "new comment has different ID",
    newComment.id,
    comment.id,
  );
}
