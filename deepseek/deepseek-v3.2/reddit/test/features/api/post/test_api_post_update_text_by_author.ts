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

export async function test_api_post_update_text_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorizedMember);
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
  // 4. Create initial text post
  const initialTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const initialContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 2,
    sentenceMax: 5,
  });
  const initialPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: initialTitle,
          community_name: community.name,
          content_type: "TEXT",
          content_text: {
            content: initialContent,
            formatting: "plain",
          } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(initialPost);
  TestValidator.equals(
    "content_type is TEXT",
    initialPost.content_type,
    "TEXT",
  );
  TestValidator.equals(
    "author matches",
    initialPost.author.id,
    authorizedMember.id,
  );
  // 5. Update post with new title and content
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 10,
  });
  const updatedContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 3,
    sentenceMax: 6,
  });
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(
      memberConnection,
      {
        postId: initialPost.id,
        body: {
          title: updatedTitle,
          textContent: {
            content: updatedContent,
            formatting: "markdown",
          } satisfies ICommunityPlatformPostText.IUpdate,
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert(updatedPost);
  // 6. Validate update results
  TestValidator.equals("title updated", updatedPost.title, updatedTitle);
  TestValidator.equals(
    "content_type remains TEXT",
    updatedPost.content_type,
    "TEXT",
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    initialPost.updated_at,
    updatedPost.updated_at,
  );
  TestValidator.predicate(
    "updated_at is later",
    () => new Date(updatedPost.updated_at) > new Date(initialPost.updated_at),
  );
  // Validate text content
  TestValidator.equals(
    "content is ICommunityPlatformPostText",
    "content" in updatedPost.content,
    true,
  );
  const textContent = updatedPost.content as ICommunityPlatformPostText;
  TestValidator.equals(
    "text content updated",
    textContent.content,
    updatedContent,
  );
  TestValidator.equals(
    "formatting updated",
    textContent.formatting,
    "markdown",
  );
  // 7. Test that only author can update post
  // Create a different member
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherAuthorizedMember = await authorize_member_join(
    otherMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        href: "https://example.com",
        referrer: "https://example.com/referrer",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(otherAuthorizedMember);
  // Attempt to update with non-author - should fail
  await TestValidator.error("non-author cannot update post", async () => {
    await api.functional.communityPlatform.member.posts.update(
      otherMemberConnection,
      {
        postId: initialPost.id,
        body: {
          title: "Unauthorized Update",
          textContent: {
            content: "This should fail",
            formatting: "plain",
          } satisfies ICommunityPlatformPostText.IUpdate,
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  });
}
