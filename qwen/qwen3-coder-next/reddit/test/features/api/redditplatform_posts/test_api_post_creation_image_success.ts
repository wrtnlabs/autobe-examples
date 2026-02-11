import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_posts_create } from "../../../generate/generate_random_reddit_platform_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_creation_image_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // Update member connection with token
  const authenticatedMemberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${member.token.access}`,
    },
  };
  // 2. Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      authenticatedMemberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      authenticatedMemberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create IMAGE post with all required fields
  const imageUrl = "https://example.com/image.jpg";
  const post = await api.functional.redditPlatform.posts.create(
    authenticatedMemberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "IMAGE" as const,
        imageUrl: imageUrl,
        content: null,
        url: null,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Validate post structure and content
  TestValidator.equals("type is IMAGE", post.type, "IMAGE");
  TestValidator.equals("imageUrl matches", post.imageUrl, imageUrl);
  TestValidator.equals("content is null for IMAGE post", post.content, null);
  TestValidator.equals("url is null for IMAGE post", post.url, null);
  TestValidator.equals("voteScore is 0", post.voteScore, 0);
  TestValidator.equals("commentCount is 0", post.commentCount, 0);
  TestValidator.equals("author id matches member", post.author.id, member.id);
  TestValidator.equals(
    "community id matches created community",
    post.community.id,
    community.id,
  );
  TestValidator.predicate(
    "has valid created timestamp",
    new Date(post.createdAt) <= new Date(),
  );
  TestValidator.predicate(
    "has valid updated timestamp",
    new Date(post.updatedAt) <= new Date(),
  );
  TestValidator.equals("deletedAt is null", post.deletedAt, null);
}
