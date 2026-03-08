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

/**
 * Test that a member cannot update a post they did not author.
 *
 * Setup:
 * 1. Member A joins, creates a community, subscribes to it, and creates a post
 * 2. Member B joins and subscribes to the same community
 *
 * Test Execution:
 * - Member B attempts to update Member A's post
 * - Should receive 403 Forbidden error
 * - Original post should remain unchanged
 */
export async function test_api_post_update_by_non_author_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Member A: Create connection and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
      href: "https://test.example.com",
      referrer: "https://test.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAAuth);
  // Member A: Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          icon: null,
        },
      },
    );
  typia.assert(community);
  // Member A: Subscribe to own community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberAConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // Member A: Create a text post
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "text",
        textContent: RandomGenerator.content({ paragraphs: 3 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // Capture original post data for later verification
  const originalTitle = post.title;
  const originalTextContent = post.text_content;
  const originalUpdatedAt = post.updated_at;
  // Member B: Create separate connection and authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
      href: "https://test.example.com",
      referrer: "https://test.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberBAuth);
  // Member B: Subscribe to Member A's community
  const memberBSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberBConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(memberBSubscription);
  // Test: Member B attempts to update Member A's post
  // This should fail with 403 Forbidden because Member B is not the author
  await TestValidator.httpError(
    "non-author cannot update post",
    403,
    async () => {
      await api.functional.communityPlatform.member.posts.update(
        memberBConnection,
        {
          postId: post.id,
          body: {
            title: "Attempted Title Change",
            text_content: "Attempted content change by non-author",
          },
        },
      );
    },
  );
  // Note: In a real test environment, we would fetch the post again to verify
  // it remains unchanged. However, since we don't have a post fetch API listed,
  // we validate the error was correctly raised.
}
