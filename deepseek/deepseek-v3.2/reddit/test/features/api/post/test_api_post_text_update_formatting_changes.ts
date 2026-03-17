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
 * Test that updating text content with different formatting options works correctly.
 * This scenario should test updating from plain text to markdown formatting and verify
 * content_length is recalculated correctly.
 */
export async function test_api_post_text_update_formatting_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
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
  // 2. Create community for posting
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
  // 4. Create TEXT-type post with plain text content
  const initialPlainContent = RandomGenerator.paragraph({ sentences: 3 });
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        content_type: "TEXT" as const,
        content_text: {
          content: initialPlainContent,
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Validate initial post has text content
  TestValidator.equals(
    "post content type should be TEXT",
    post.content_type,
    "TEXT",
  );
  typia.assertGuard(post.content);
  const initialTextContent = post.content as ICommunityPlatformPostText;
  typia.assert(initialTextContent);
  TestValidator.equals(
    "initial formatting should be plain",
    initialTextContent.formatting,
    "plain",
  );
  TestValidator.equals(
    "initial content should match",
    initialTextContent.content,
    initialPlainContent,
  );
  // 5. Update text content with markdown formatting
  const markdownContent = `# Heading\n\nThis is **bold** text and *italic* text.\n\n- List item 1\n- List item 2\n- List item 3\n\n\`Inline code\` and \`\`\`block code\`\`\``;
  const updatedText =
    await api.functional.communityPlatform.member.posts.texts.update(
      memberConnection,
      {
        postId: post.id,
        textId: initialTextContent.id,
        body: {
          content: markdownContent,
          formatting: "markdown",
        } satisfies ICommunityPlatformPostText.IUpdate,
      },
    );
  typia.assert(updatedText);
  // 6. Validate formatting and content length
  TestValidator.equals(
    "formatting should change to markdown",
    updatedText.formatting,
    "markdown",
  );
  TestValidator.equals(
    "content should match markdown input",
    updatedText.content,
    markdownContent,
  );
  TestValidator.equals(
    "content_length should reflect new content",
    updatedText.content_length,
    markdownContent.length,
  );
  TestValidator.notEquals(
    "content_length should differ from original",
    updatedText.content_length,
    initialTextContent.content_length,
  );
  // 7. Test undefined formatting (should retain previous formatting)
  const plainContent = "Simple plain text without formatting.";
  const updatedWithUndefinedFormatting =
    await api.functional.communityPlatform.member.posts.texts.update(
      memberConnection,
      {
        postId: post.id,
        textId: updatedText.id,
        body: {
          content: plainContent,
          formatting: undefined,
        } satisfies ICommunityPlatformPostText.IUpdate,
      },
    );
  typia.assert(updatedWithUndefinedFormatting);
  TestValidator.equals(
    "content should update",
    updatedWithUndefinedFormatting.content,
    plainContent,
  );
  TestValidator.equals(
    "formatting should retain previous value",
    updatedWithUndefinedFormatting.formatting,
    "markdown",
  );
  TestValidator.equals(
    "content_length should update",
    updatedWithUndefinedFormatting.content_length,
    plainContent.length,
  );
}
