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

/**
 * Test temporary user ban via comment moderation.
 * 1. Create moderator account and authenticate
 * 2. Create regular user account and authenticate
 * 3. Create community where ban will be enforced
 * 4. Create post for comment creation
 * 5. Create comment by user that will trigger the ban
 * 6. Perform ban_user moderation action with duration_hours
 * 7. Verify moderation record tracks the action correctly
 * 8. Test that banned user cannot create new comments during ban period
 */
export async function test_api_comment_moderation_user_ban_with_duration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "moderator123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  // 2. Create and authenticate regular user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // 3. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create comment by user
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Perform ban_user moderation action with duration_hours
  const banDurationHours = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<24>
  >();
  const moderation =
    await generate_random_community_platform_moderator_posts_comments_moderations_create(
      moderatorConnection,
      {
        body: {
          action_type: "ban_user",
          reason: "Violation of community guidelines",
          status: "active",
          duration_hours: banDurationHours,
        } satisfies ICommunityPlatformCommentModeration.ICreate,
        params: {
          postId: post.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(moderation);
  // 7. Verify moderation record tracks the action correctly
  TestValidator.equals(
    "action type is ban_user",
    moderation.action_type,
    "ban_user",
  );
  TestValidator.equals(
    "reason matches",
    moderation.reason,
    "Violation of community guidelines",
  );
  TestValidator.equals("status is active", moderation.status, "active");
  TestValidator.equals(
    "duration hours matches",
    moderation.duration_hours,
    banDurationHours,
  );
  TestValidator.equals(
    "moderator id matches",
    moderation.moderator.id,
    moderatorAuth.id,
  );
  TestValidator.equals("comment id matches", moderation.comment.id, comment.id);
  TestValidator.predicate(
    "expired_at should be set for temporary ban",
    moderation.expired_at !== null,
  );
  // Verify expired_at timestamp calculation
  const createdTime = new Date(moderation.created_at).getTime();
  const expiredTime = new Date(moderation.expired_at!).getTime();
  const expectedDurationMs = banDurationHours * 60 * 60 * 1000;
  const actualDurationMs = expiredTime - createdTime;
  // Allow small tolerance for timestamp differences
  TestValidator.predicate(
    "expired_at is approximately correct",
    Math.abs(actualDurationMs - expectedDurationMs) < 1000,
  );
  // 8. Test that banned user cannot create new comments during ban period
  await TestValidator.error("banned user cannot create comments", async () => {
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  });
}
