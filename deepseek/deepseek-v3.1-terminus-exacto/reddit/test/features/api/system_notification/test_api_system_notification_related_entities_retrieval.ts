import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotification";
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
import { generate_random_community_platform_admin_system_notifications_create } from "../../../generate/generate_random_community_platform_admin_system_notifications_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_system_notification } from "../../../prepare/prepare_random_community_platform_system_notification";

export async function test_api_system_notification_related_entities_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Login user for subsequent operations
  const loggedInUserConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(loggedInUserConnection, {
    body: {
      email: userAuth.email,
      password: "user123",
    } satisfies ICommunityPlatformUser.ILogin,
  });
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      loggedInUserConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post
  const post = await generate_random_community_platform_user_posts_create(
    loggedInUserConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create comment
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      loggedInUserConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: null,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Create system notification with related entities
  const notification =
    await generate_random_community_platform_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          notification_type: "moderation_actions",
          title: RandomGenerator.paragraph({ sentences: 1 }),
          message: RandomGenerator.paragraph({ sentences: 3 }),
          priority: "normal",
          status: "pending",
          is_broadcast: false,
          related_community_id: community.id,
          related_post_id: post.id,
          related_comment_id: comment.id,
          action_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // Retrieve the notification using admin connection
  const retrievedNotification =
    await api.functional.communityPlatform.admin.system_notifications.at(
      adminConnection,
      {
        systemNotificationId: notification.id,
      },
    );
  typia.assert(retrievedNotification);
  // Validate related community summary
  TestValidator.predicate(
    "relatedCommunity exists",
    retrievedNotification.relatedCommunity !== null,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedNotification.relatedCommunity!.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedNotification.relatedCommunity!.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    retrievedNotification.relatedCommunity!.description,
    community.description,
  );
  // Validate related post summary
  TestValidator.predicate(
    "relatedPost exists",
    retrievedNotification.relatedPost !== null,
  );
  TestValidator.equals(
    "post ID matches",
    retrievedNotification.relatedPost!.id,
    post.id,
  );
  TestValidator.equals(
    "post title matches",
    retrievedNotification.relatedPost!.title,
    post.title,
  );
  TestValidator.equals(
    "post type matches",
    retrievedNotification.relatedPost!.post_type,
    post.post_type,
  );
  // Validate related comment summary
  TestValidator.predicate(
    "relatedComment exists",
    retrievedNotification.relatedComment !== null,
  );
  TestValidator.equals(
    "comment ID matches",
    retrievedNotification.relatedComment!.id,
    comment.id,
  );
  TestValidator.predicate(
    "comment content matches",
    retrievedNotification.relatedComment!.content.includes(
      comment.content.substring(0, 50),
    ),
  );
}
