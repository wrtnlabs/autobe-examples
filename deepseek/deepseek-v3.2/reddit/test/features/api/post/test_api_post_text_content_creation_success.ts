import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
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
import { generate_random_community_platform_member_posts_texts_create } from "../../../generate/generate_random_community_platform_member_posts_texts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test successful text content creation on a TEXT-type post.
 * 1. Create member account and authenticate
 * 2. Create community and subscribe to it
 * 3. Create TEXT-type post (prerequisite)
 * 4. Add meaningful text content to the post
 * 5. Validate text content is saved correctly with automatic length calculation
 * 6. Verify formatting defaults to 'plain' when not specified
 * 7. Confirm post relationship is established
 */
export async function test_api_post_text_content_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community with valid name format
  const communityName = RandomGenerator.alphaNumeric(10)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals("subscription is active", subscription.active, true);
  // 4. Create TEXT-type post (without text content initially)
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_name: community.name,
        content_type: "TEXT",
        // No content_text - will add via separate endpoint
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals("post is TEXT type", post.content_type, "TEXT");
  // 5. Add meaningful text content to the post
  const meaningfulContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const textContent =
    await generate_random_community_platform_member_posts_texts_create(
      memberConnection,
      {
        body: {
          content: meaningfulContent,
          // formatting not specified → should default to 'plain'
        } satisfies ICommunityPlatformPostText.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(textContent);
  // 6. Validate text content is saved correctly
  TestValidator.equals(
    "content matches input",
    textContent.content,
    meaningfulContent,
  );
  TestValidator.equals(
    "formatting defaults to 'plain'",
    textContent.formatting,
    "plain",
  );
  TestValidator.equals(
    "content length calculated correctly",
    textContent.content_length,
    meaningfulContent.length,
  );
  TestValidator.equals(
    "post relationship established",
    textContent.post.id,
    post.id,
  );
  TestValidator.predicate(
    "deleted_at is null (active content)",
    textContent.deleted_at === null,
  );
  // 7. Additional test: create with explicit formatting
  const formattedTextContent =
    await generate_random_community_platform_member_posts_texts_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "markdown",
        } satisfies ICommunityPlatformPostText.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(formattedTextContent);
  TestValidator.equals(
    "explicit formatting preserved",
    formattedTextContent.formatting,
    "markdown",
  );
}
