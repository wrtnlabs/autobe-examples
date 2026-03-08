import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_creation_text_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authResult);
  const initialKarma = authResult.karma;
  const memberId = authResult.id;
  // 2. Create a new community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the created community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postContent = RandomGenerator.content({ paragraphs: 2 });
  const post = await api.functional.communityPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: postTitle,
        contentType: "text",
        textContent: postContent,
        linkUrl: null,
        imageUrl: null,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Validate post properties
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.equals("post content_type is text", post.content_type, "text");
  TestValidator.equals(
    "post text_content matches",
    post.text_content,
    postContent,
  );
  TestValidator.equals("post link_url is null", post.link_url, null);
  TestValidator.equals("post image_url is null", post.image_url, null);
  TestValidator.equals("post score equals 1", post.score, 1);
  TestValidator.equals("post comment_count equals 0", post.comment_count, 0);
  TestValidator.equals("post deleted_at is null", post.deleted_at, null);
  // 6. Validate author relation
  TestValidator.equals("author id matches", post.author.id, memberId);
  TestValidator.equals(
    "author username matches",
    post.author.username,
    authResult.username,
  );
  // 7. Validate community relation
  TestValidator.equals("community id matches", post.community.id, community.id);
  TestValidator.equals(
    "community name matches",
    post.community.name,
    community.name,
  );
  // 8. Validate karma increment (self-upvote gives +1 karma)
  TestValidator.predicate(
    "author karma increased by 1",
    post.author.karma === initialKarma + 1,
  );
}
