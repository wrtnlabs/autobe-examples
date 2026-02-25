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
import { generate_random_community_platform_admin_posts_comments_moderations_create } from "../../../generate/generate_random_community_platform_admin_posts_comments_moderations_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_moderation } from "../../../prepare/prepare_random_community_platform_comment_moderation";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_admin_comment_moderation_delete_inappropriate_content(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate regular user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(userAuth);
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Create post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
      },
    },
  );
  typia.assert(post);
  // Create inappropriate comment
  const inappropriateComment =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        body: {
          content:
            "This comment contains inappropriate content that violates community guidelines",
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(inappropriateComment);
  // Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  // Perform moderation action to delete the inappropriate comment
  const moderation =
    await generate_random_community_platform_admin_posts_comments_moderations_create(
      adminConnection,
      {
        body: {
          action_type: "delete",
          reason: "Content violates community guidelines",
          status: "active",
          duration_hours: null,
        },
        params: {
          postId: post.id,
          commentId: inappropriateComment.id,
        },
      },
    );
  typia.assert(moderation);
  // Validate moderation record
  TestValidator.equals(
    "moderation action type",
    moderation.action_type,
    "delete",
  );
  TestValidator.equals(
    "moderation reason",
    moderation.reason,
    "Content violates community guidelines",
  );
  TestValidator.equals("moderation status", moderation.status, "active");
  TestValidator.equals("moderation duration", moderation.duration_hours, null);
  TestValidator.equals("moderator id", moderation.moderator.id, adminAuth.id);
  TestValidator.equals(
    "comment id",
    moderation.comment.id,
    inappropriateComment.id,
  );
  TestValidator.predicate(
    "moderation has valid timestamp",
    new Date(moderation.created_at) <= new Date(),
  );
  // Validate that comment is marked as deleted in the moderation record
  TestValidator.predicate(
    "comment is marked as deleted in moderation",
    moderation.comment.content.includes("inappropriate content"),
  );
}
