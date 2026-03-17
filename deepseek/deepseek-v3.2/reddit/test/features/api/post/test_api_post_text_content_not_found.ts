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

export async function test_api_post_text_content_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Create a community using the member connection
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community (required for posting)
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
  // 4. Create a text post in the community
  const textPost = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(textPost);
  // Verify the post has TEXT content type and extract the textId
  TestValidator.equals("post content type", textPost.content_type, "TEXT");
  typia.assertGuard(textPost.content);
  const textContent = textPost.content as ICommunityPlatformPostText;
  const validTextId = textContent.id;
  const validPostId = textPost.id;
  // 5. Test 1: Non-existent textId with valid postId
  await TestValidator.error(
    "should return 404 for non-existent textId",
    async () => {
      const nonExistentTextId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.communityPlatform.posts.texts.at(memberConnection, {
        postId: validPostId,
        textId: nonExistentTextId,
      });
    },
  );
  // 6. Test 2: Create another post to get a different textId and test foreign key mismatch
  const anotherPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          community_name: community.name,
          content_type: "TEXT",
          content_text: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
            formatting: "plain",
          } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(anotherPost);
  TestValidator.equals(
    "another post content type",
    anotherPost.content_type,
    "TEXT",
  );
  typia.assertGuard(anotherPost.content);
  const anotherTextContent = anotherPost.content as ICommunityPlatformPostText;
  const mismatchedTextId = anotherTextContent.id;
  // The textId from another post should not belong to the first post
  await TestValidator.error(
    "should return 404 for textId belonging to different post",
    async () => {
      await api.functional.communityPlatform.posts.texts.at(memberConnection, {
        postId: validPostId,
        textId: mismatchedTextId,
      });
    },
  );
  // 7. Test 3: Valid request should succeed (sanity check)
  const validText = await api.functional.communityPlatform.posts.texts.at(
    memberConnection,
    {
      postId: validPostId,
      textId: validTextId,
    },
  );
  typia.assert(validText);
  TestValidator.equals("text content matches", validText.id, validTextId);
  TestValidator.equals("text belongs to post", validText.post.id, validPostId);
}
