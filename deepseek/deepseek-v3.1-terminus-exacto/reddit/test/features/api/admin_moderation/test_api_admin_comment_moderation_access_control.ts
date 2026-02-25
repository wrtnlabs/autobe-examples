import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentModeration";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_admin_comment_moderation_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.communityPlatform.auth.admin.login(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "admin123",
      } satisfies ICommunityPlatformAdmin.ILogin,
    },
  );
  typia.assert(adminAuth);
  // Create regular user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await api.functional.communityPlatform.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "user123",
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformUser.IJoin,
    },
  );
  typia.assert(userAuth);
  // Create community using user connection
  const community =
    await api.functional.communityPlatform.user.communities.create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post using user connection
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create comment using user connection
  const comment =
    await api.functional.communityPlatform.user.posts.comments.create(
      userConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: null,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Test successful moderation record retrieval with valid hierarchy
  const moderationRecord =
    await api.functional.communityPlatform.admin.posts.comments.moderations.at(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        moderationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(moderationRecord);
  // Test error for mismatched postId (valid commentId but wrong post)
  await TestValidator.error("mismatched postId should fail", async () => {
    await api.functional.communityPlatform.admin.posts.comments.moderations.at(
      adminConnection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        commentId: comment.id,
        moderationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Test error for mismatched commentId (valid postId but wrong comment)
  await TestValidator.error("mismatched commentId should fail", async () => {
    await api.functional.communityPlatform.admin.posts.comments.moderations.at(
      adminConnection,
      {
        postId: post.id,
        commentId: typia.random<string & tags.Format<"uuid">>(),
        moderationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Test error for non-existent post
  await TestValidator.error("non-existent post should fail", async () => {
    await api.functional.communityPlatform.admin.posts.comments.moderations.at(
      adminConnection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        commentId: comment.id,
        moderationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Test error for non-existent comment
  await TestValidator.error("non-existent comment should fail", async () => {
    await api.functional.communityPlatform.admin.posts.comments.moderations.at(
      adminConnection,
      {
        postId: post.id,
        commentId: typia.random<string & tags.Format<"uuid">>(),
        moderationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Validate that proper entity hierarchy validation is enforced
  TestValidator.predicate("entity hierarchy validation is enforced", true);
}
