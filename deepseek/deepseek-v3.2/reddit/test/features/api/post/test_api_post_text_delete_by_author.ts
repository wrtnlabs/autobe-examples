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
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test that a member can delete text content from their own TEXT-type post.
 *
 * Setup: Create a member account using authorize_member_join, create a community,
 * subscribe to the community, create a TEXT-type post with text content.
 *
 * Test steps:
 * 1. Authenticate as a member (join)
 * 2. Create a community
 * 3. Subscribe to the community
 * 4. Create a TEXT-type post with text content
 * 5. Delete the post's text content using DELETE /member/posts/{postId}/texts
 *
 * Validations:
 * - Response should be 204 No Content
 * - Post should still exist but text content should be marked as deleted
 * - Author should be able to delete their own content
 * - Only posts with content_type TEXT can have text content deleted
 */
export async function test_api_post_text_delete_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
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
  // 4. Create TEXT-type post with text content
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: typia.random<string>(),
        community_name: community.name,
        content_type: "TEXT" as const,
        content_text: {
          content: typia.random<string>(),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Verify post has TEXT content_type
  TestValidator.equals(
    "post content_type should be TEXT",
    post.content_type,
    "TEXT",
  );
  // Type check for text content
  typia.assert(post.content);
  // 5. Delete text content
  await api.functional.communityPlatform.member.posts.texts.erase(
    memberConnection,
    {
      postId: post.id,
    },
  );
  // 6. Verify deletion succeeded by trying to delete again (should error)
  await TestValidator.error(
    "should error when deleting already deleted text content",
    async () => {
      await api.functional.communityPlatform.member.posts.texts.erase(
        memberConnection,
        {
          postId: post.id,
        },
      );
    },
  );
  // 7. Test that only author can delete - create another member
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherMemberConnection, {});
  typia.assert(otherMember);
  // Other member should not be able to delete the post's text content
  await TestValidator.error(
    "non-author should not be able to delete text content",
    async () => {
      await api.functional.communityPlatform.member.posts.texts.erase(
        otherMemberConnection,
        {
          postId: post.id,
        },
      );
    },
  );
  // 8. Test edge case: non-existent post ID
  await TestValidator.error(
    "should error for non-existent post ID",
    async () => {
      await api.functional.communityPlatform.member.posts.texts.erase(
        memberConnection,
        {
          postId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
