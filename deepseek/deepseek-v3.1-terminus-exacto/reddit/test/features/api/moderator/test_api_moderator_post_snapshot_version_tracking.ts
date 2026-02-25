import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_communities_moderators_create } from "../../../generate/generate_random_community_platform_user_communities_moderators_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test post snapshot version tracking system for sequential edit history.
 * A user creates a post and performs two edits to trigger snapshot creation.
 * Since the current API doesn't provide snapshot listing, we focus on
 * validating that edits successfully create new versions and the post
 * update functionality works correctly.
 */
export async function test_api_moderator_post_snapshot_version_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and register user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // 2. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create moderator connection and register moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // 4. Assign moderator to community
  const moderatorAssignment =
    await generate_random_community_platform_user_communities_moderators_create(
      userConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: moderator.id,
          role_level: "moderator",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Create initial post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
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
  // 6. First edit (should create snapshot version 1)
  const firstEditPost =
    await api.functional.communityPlatform.user.posts.update(userConnection, {
      postId: post.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(firstEditPost);
  // 7. Second edit (should create snapshot version 2)
  const secondEditPost =
    await api.functional.communityPlatform.user.posts.update(userConnection, {
      postId: post.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(secondEditPost);
  // 8. Validate that edits were successful and posts are different
  TestValidator.notEquals(
    "post title should change after first edit",
    post.title,
    firstEditPost.title,
  );
  TestValidator.notEquals(
    "post title should change after second edit",
    firstEditPost.title,
    secondEditPost.title,
  );
  // Note: Without snapshot listing API, we cannot validate version numbers
  // or timestamp ordering. The test validates that the edit workflow functions
  // correctly and creates distinct post versions.
}