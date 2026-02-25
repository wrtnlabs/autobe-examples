import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_post_update_successful_within_edit_window(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.communityPlatform.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformUser.IJoin,
    },
  );
  typia.assert(user);
  // Create community
  const community =
    await api.functional.communityPlatform.user.communities.create(
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
  // Create initial text post
  const initialPost = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(initialPost);
  // Update post title
  const updatedTitle = RandomGenerator.paragraph({ sentences: 1 });
  const updatedPost = await api.functional.communityPlatform.user.posts.update(
    userConnection,
    {
      postId: initialPost.id,
      body: {
        title: updatedTitle,
      } satisfies ICommunityPlatformPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // Validate updates
  TestValidator.equals("title updated", updatedPost.title, updatedTitle);
  TestValidator.equals("author unchanged", updatedPost.author.id, user.id);
  TestValidator.equals(
    "community unchanged",
    updatedPost.community.id,
    community.id,
  );
  TestValidator.equals("post type unchanged", updatedPost.post_type, "text");
  TestValidator.equals(
    "votes count unchanged",
    updatedPost.votes_count,
    initialPost.votes_count,
  );
  TestValidator.equals(
    "comments count unchanged",
    updatedPost.comments_count,
    initialPost.comments_count,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedPost.created_at,
    initialPost.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedPost.updated_at,
    initialPost.updated_at,
  );
}
