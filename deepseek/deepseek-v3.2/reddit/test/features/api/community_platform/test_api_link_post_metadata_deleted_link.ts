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

export async function test_api_link_post_metadata_deleted_link(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Subscribe to community
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
  // Create LINK-type post using utility function with minimal configuration
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        content_type: "LINK" as const,
        community_name: community.name,
      } satisfies Partial<ICommunityPlatformPost.ICreate>,
    },
  );
  typia.assert(post);
  // Verify post is actually LINK type
  TestValidator.equals(
    "post content type should be LINK",
    post.content_type,
    "LINK",
  );
  // Verify content exists and is ICommunityPlatformPostLink
  typia.assert<ICommunityPlatformPostLink>(post.content);
  const link = post.content as ICommunityPlatformPostLink;
  // Test 1: Verify link metadata can be retrieved normally
  const retrievedLink = await api.functional.communityPlatform.posts.links.at(
    memberConnection,
    {
      postId: post.id,
      linkId: link.id,
    },
  );
  typia.assert(retrievedLink);
  TestValidator.equals(
    "retrieved link ID should match",
    retrievedLink.id,
    link.id,
  );
  // Test 2: Attempt to retrieve link with non-existent ID (should return 404)
  const nonExistentLinkId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 for non-existent link",
    404,
    async () => {
      await api.functional.communityPlatform.posts.links.at(memberConnection, {
        postId: post.id,
        linkId: nonExistentLinkId,
      });
    },
  );
  // Test 3: Attempt to retrieve link with invalid post ID (should return 404)
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 for non-existent post",
    404,
    async () => {
      await api.functional.communityPlatform.posts.links.at(memberConnection, {
        postId: nonExistentPostId,
        linkId: link.id,
      });
    },
  );
  // Test 4: Attempt to retrieve link when post exists but link ID doesn't match post
  // Create another LINK-type post
  const post2 = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        content_type: "LINK" as const,
        community_name: community.name,
      } satisfies Partial<ICommunityPlatformPost.ICreate>,
    },
  );
  typia.assert(post2);
  TestValidator.equals(
    "post2 content type should be LINK",
    post2.content_type,
    "LINK",
  );
  typia.assert<ICommunityPlatformPostLink>(post2.content);
  const link2 = post2.content as ICommunityPlatformPostLink;
  // Try to retrieve link2 with post1's ID (should fail with 404)
  await TestValidator.httpError(
    "should return 404 when link doesn't belong to post",
    404,
    async () => {
      await api.functional.communityPlatform.posts.links.at(memberConnection, {
        postId: post.id,
        linkId: link2.id,
      });
    },
  );
  // Note: The scenario mentions testing soft-deleted links and soft-deleted parent posts,
  // but no API endpoints are provided for soft-deleting links or posts.
  // We test the expected 404 behavior with non-existent and mismatched IDs instead.
}
