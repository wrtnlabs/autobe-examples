import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_posts_comments_moderations_create } from "../../../generate/generate_random_community_platform_moderator_posts_comments_moderations_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_moderation } from "../../../prepare/prepare_random_community_platform_comment_moderation";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_moderation_audit_scoping(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(10),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create first post
  const post1 = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  // Create second post
  const post2 = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  // Create comment on first post
  const comment1 =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post1.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment1);
  // Create comment on second post
  const comment2 =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post2.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment2);
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(10),
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Create moderation action on first comment
  const moderation1 =
    await generate_random_community_platform_moderator_posts_comments_moderations_create(
      moderatorConnection,
      {
        params: { postId: post1.id, commentId: comment1.id },
        body: {
          action_type: "delete",
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          status: "active",
        } satisfies ICommunityPlatformCommentModeration.ICreate,
      },
    );
  typia.assert(moderation1);
  // Create moderation action on second comment
  const moderation2 =
    await generate_random_community_platform_moderator_posts_comments_moderations_create(
      moderatorConnection,
      {
        params: { postId: post2.id, commentId: comment2.id },
        body: {
          action_type: "approve",
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          status: "active",
        } satisfies ICommunityPlatformCommentModeration.ICreate,
      },
    );
  typia.assert(moderation2);
  // Test 1: Valid retrieval - moderation1 via correct post1/comment1
  const validModeration =
    await api.functional.communityPlatform.moderator.posts.comments.moderations.at(
      moderatorConnection,
      {
        postId: post1.id,
        commentId: comment1.id,
        moderationId: moderation1.id,
      },
    );
  typia.assert(validModeration);
  TestValidator.equals(
    "valid moderation retrieval",
    validModeration.id,
    moderation1.id,
  );
  // Test 2: Invalid retrieval - moderation1 via wrong post2/comment1 (mismatched post-comment)
  await TestValidator.error(
    "mismatched post-comment relationship",
    async () => {
      await api.functional.communityPlatform.moderator.posts.comments.moderations.at(
        moderatorConnection,
        {
          postId: post2.id,
          commentId: comment1.id,
          moderationId: moderation1.id,
        },
      );
    },
  );
  // Test 3: Invalid retrieval - moderation1 via post1/comment2 (mismatched comment-moderation)
  await TestValidator.error(
    "mismatched comment-moderation relationship",
    async () => {
      await api.functional.communityPlatform.moderator.posts.comments.moderations.at(
        moderatorConnection,
        {
          postId: post1.id,
          commentId: comment2.id,
          moderationId: moderation1.id,
        },
      );
    },
  );
  // Test 4: Invalid retrieval - moderation2 via post1/comment1 (mismatched moderation-comment)
  await TestValidator.error(
    "mismatched moderation-comment relationship",
    async () => {
      await api.functional.communityPlatform.moderator.posts.comments.moderations.at(
        moderatorConnection,
        {
          postId: post1.id,
          commentId: comment1.id,
          moderationId: moderation2.id,
        },
      );
    },
  );
}
