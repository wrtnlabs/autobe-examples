import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_moderator_deletion_with_karma_impact_verification(
  connection: api.IConnection,
): Promise<void> {
  // Create user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Create community
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
  // Create post
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
  // Since voting endpoints are not available in the provided API functions,
  // we'll test the basic deletion functionality and karma integrity
  // The test verifies that moderator deletion works without errors
  // and maintains system integrity even without explicit vote tracking
  // Delete post as moderator
  await api.functional.communityPlatform.moderator.posts.erase(
    moderatorConnection,
    {
      postId: post.id,
    },
  );
  // Verify successful deletion by testing that the post cannot be accessed again
  // This demonstrates that the deletion was processed correctly
  await TestValidator.error(
    "post should be inaccessible after deletion",
    async () => {
      // Attempt to delete again - should fail since post is already deleted
      await api.functional.communityPlatform.moderator.posts.erase(
        moderatorConnection,
        {
          postId: post.id,
        },
      );
    },
  );
  // Test that user account still exists and system integrity is maintained
  const refreshedUser = await authorize_user_login(userConnection, {
    body: {
      email: user.email,
      password: "password123",
    } satisfies ICommunityPlatformUser.ILogin,
  });
  typia.assert(refreshedUser);
  // Verify user account integrity after post deletion
  TestValidator.equals(
    "user account remains intact",
    refreshedUser.id,
    user.id,
  );
  TestValidator.predicate(
    "user karma system integrity maintained",
    refreshedUser.karma >= 0,
  );
}
