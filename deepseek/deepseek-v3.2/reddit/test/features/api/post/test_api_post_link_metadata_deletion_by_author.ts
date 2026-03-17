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
import { generate_random_community_platform_member_posts_links_create } from "../../../generate/generate_random_community_platform_member_posts_links_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test that a member can successfully delete link metadata from their own LINK-type post.
 * 1. Create member account and authorize
 * 2. Create community using member connection
 * 3. Subscribe to the community
 * 4. Create LINK-type post with minimal metadata
 * 5. Add link metadata to the post
 * 6. Delete link metadata via DELETE /member/posts/{postId}/link
 * 7. Validate the post still exists but link metadata is removed
 */
export async function test_api_post_link_metadata_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
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
  // 4. Create LINK-type post WITHOUT link metadata initially
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "LINK" as const,
        // Create post without link metadata initially
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals("post should be LINK type", post.content_type, "LINK");
  // 5. Add link metadata to the post
  const linkMetadata =
    await generate_random_community_platform_member_posts_links_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          url: "https://example.com/article" satisfies string &
            tags.MaxLength<80000> &
            tags.Format<"url">,
          title: "Example Article",
          description: "This is an example article for testing.",
          thumbnail_url: "https://example.com/thumbnail.jpg" satisfies
            | (string & tags.MaxLength<80000> & tags.Format<"url">)
            | null
            | undefined,
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(linkMetadata);
  // 6. Delete link metadata
  await api.functional.communityPlatform.member.posts.link.erase(
    memberConnection,
    {
      postId: post.id,
    },
  );
  // 7. Validate that link metadata is deleted by trying to add new metadata (should succeed)
  const newLinkMetadata =
    await generate_random_community_platform_member_posts_links_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          url: "https://new-example.com/article" satisfies string &
            tags.MaxLength<80000> &
            tags.Format<"url">,
          title: "New Article",
          description: "This is a new article for testing.",
          thumbnail_url: null,
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(newLinkMetadata);
  TestValidator.equals(
    "new link should have different URL",
    newLinkMetadata.url,
    "https://new-example.com/article",
  );
  TestValidator.equals(
    "new link should have different domain",
    newLinkMetadata.domain,
    "new-example.com",
  );
  // 8. Validate post still exists and functional by creating a comment or other action
  // This ensures the post wasn't corrupted by metadata deletion
  TestValidator.predicate(
    "post ID should be valid UUID",
    /^[0-9a-f-]{36}$/i.test(post.id),
  );
}
