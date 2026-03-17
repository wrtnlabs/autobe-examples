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

export async function test_api_post_text_delete_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator setup (community owner)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
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
  typia.assert(moderator);
  const community =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const moderatorSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      moderatorConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(moderatorSubscription);
  TestValidator.equals(
    "subscription active",
    moderatorSubscription.active,
    true,
  );
  // 2. Author setup
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
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
  typia.assert(author);
  const authorSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(authorSubscription);
  TestValidator.equals(
    "author subscription active",
    authorSubscription.active,
    true,
  );
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        community_name: community.name,
        content_type: "TEXT" as const,
        content_text: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 12,
          }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals("post content type", post.content_type, "TEXT");
  // 3. Moderator deletes text content
  await api.functional.communityPlatform.member.posts.texts.erase(
    moderatorConnection,
    {
      postId: post.id,
    },
  );
  // Expect 204 No Content (void return)
  // 4. Verify author cannot delete other's post text
  await TestValidator.error(
    "author cannot delete other's post text",
    async () => {
      // Create another author
      const otherAuthorConnection: api.IConnection = { host: connection.host };
      const otherAuthor = await authorize_member_join(otherAuthorConnection, {
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
      typia.assert(otherAuthor);
      // Other author subscribes to community
      await generate_random_community_platform_member_subscriptions_create(
        otherAuthorConnection,
        {
          body: {
            community_id: community.id,
            active: true,
          } satisfies ICommunityPlatformSubscription.ICreate,
        },
      );
      // Attempt to delete original post's text content (should fail)
      await api.functional.communityPlatform.member.posts.texts.erase(
        otherAuthorConnection,
        {
          postId: post.id,
        },
      );
    },
  );
  // 5. Verify non-subscriber cannot delete
  await TestValidator.error(
    "non-subscriber cannot delete text content",
    async () => {
      const nonMemberConnection: api.IConnection = { host: connection.host };
      const nonMember = await authorize_member_join(nonMemberConnection, {
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
      typia.assert(nonMember);
      // Non-member NOT subscribed - attempt delete (should fail)
      await api.functional.communityPlatform.member.posts.texts.erase(
        nonMemberConnection,
        {
          postId: post.id,
        },
      );
    },
  );
}
