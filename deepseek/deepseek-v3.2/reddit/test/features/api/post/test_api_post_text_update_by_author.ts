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

export async function test_api_post_text_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member using utility function (no need to specify body)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community using utility function
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community using utility function
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
  // 4. Create a TEXT-type post using utility function
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: typia.random<string>(),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: typia.random<string>(),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals("post content type", post.content_type, "TEXT");
  // 5. Create initial text content (additional text content) using utility function
  const initialText =
    await generate_random_community_platform_member_posts_texts_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: typia.random<string>(),
          formatting: "markdown",
        } satisfies ICommunityPlatformPostText.ICreate,
      },
    );
  typia.assert(initialText);
  // 6. Update the text content
  const newContent = typia.random<string>();
  const newFormatting = "html";
  const updatedText =
    await api.functional.communityPlatform.member.posts.texts.update(
      memberConnection,
      {
        postId: post.id,
        textId: initialText.id,
        body: {
          content: newContent,
          formatting: newFormatting,
        } satisfies ICommunityPlatformPostText.IUpdate,
      },
    );
  typia.assert(updatedText);
  // 7. Validate updated content
  TestValidator.equals("updated content", updatedText.content, newContent);
  TestValidator.equals(
    "updated formatting",
    updatedText.formatting,
    newFormatting,
  );
  TestValidator.equals(
    "content length matches",
    updatedText.content_length,
    newContent.length,
  );
  // 8. Ensure only text-type posts can be updated
  // Create a LINK-type post using utility function
  const linkPost = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: typia.random<string>(),
        community_name: community.name,
        content_type: "LINK",
        content_link: {
          url: "https://example.com",
          title: typia.random<string>(),
          description: typia.random<string>(),
          thumbnail_url: "https://example.com/image.jpg",
        } satisfies ICommunityPlatformPostLink.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(linkPost);
  TestValidator.equals("link post content type", linkPost.content_type, "LINK");
  // Try to update text content on LINK post - should fail
  await TestValidator.error("cannot update text on LINK post", async () => {
    await api.functional.communityPlatform.member.posts.texts.update(
      memberConnection,
      {
        postId: linkPost.id,
        textId: typia.random<string>(),
        body: {
          content: "new content",
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.IUpdate,
      },
    );
  });
}