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
 * Test the successful retrieval of a text post with complete metadata.
 * First, create a new member account through the join endpoint, then create a community,
 * subscribe to it, and create a text post. Retrieve the post using the generated post ID and
 * verify all expected fields are present: title, author information (member summary with id,
 * email, username, nickname, email_verified, registered_at, last_login_at), community information
 * (community summary with id, name, description, created_at, owner, subscriber_count), content_type TEXT
 * with content field containing text content from ICommunityPlatformPostText, vote_score (should be 0 for new post),
 * comment_count (should be 0 for new post), created_at, updated_at, deleted_at (should be null),
 * and content object with text content. Validate that the response matches the created post data
 * and all timestamps are properly formatted. Also test that the post can be retrieved by a
 * guest user (no authentication required) since this endpoint is public.
 */
export async function test_api_post_retrieval_text_content_complete_metadata(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community using utility function
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
        },
      },
    );
  typia.assert(subscription);
  // 4. Create text post using utility function
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        content_type: "TEXT" as const,
        content_text: {
          content: RandomGenerator.content({ paragraphs: 2 }),
          formatting: "plain",
        },
      },
    },
  );
  typia.assert(post);
  
  // Narrow the post content type since we know it's TEXT
  typia.assertGuard<ICommunityPlatformPostText>(post.content);
  const postTextContent = post.content as ICommunityPlatformPostText;
  
  // 5. Retrieve post by authenticated member
  const retrievedByMember = await api.functional.communityPlatform.posts.at(
    memberConnection,
    { postId: post.id },
  );
  typia.assert(retrievedByMember);
  // Validate all expected fields present and correct
  TestValidator.equals("post id", retrievedByMember.id, post.id);
  TestValidator.equals("post title", retrievedByMember.title, post.title);
  TestValidator.equals("content type", retrievedByMember.content_type, "TEXT");
  TestValidator.equals("vote score", retrievedByMember.vote_score, 0);
  TestValidator.equals("comment count", retrievedByMember.comment_count, 0);
  TestValidator.predicate("created_at is valid ISO string", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/.test(
      retrievedByMember.created_at,
    ),
  );
  TestValidator.predicate("updated_at is valid ISO string", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/.test(
      retrievedByMember.updated_at,
    ),
  );
  TestValidator.equals(
    "deleted_at should be null",
    retrievedByMember.deleted_at,
    null,
  );
  // Validate author information
  TestValidator.equals("author id", retrievedByMember.author.id, member.id);
  TestValidator.equals(
    "author email",
    retrievedByMember.author.email,
    member.email,
  );
  TestValidator.equals(
    "author username",
    retrievedByMember.author.username,
    member.username,
  );
  TestValidator.equals(
    "author nickname",
    retrievedByMember.author.nickname,
    member.nickname,
  );
  TestValidator.equals(
    "author email_verified",
    retrievedByMember.author.email_verified,
    member.email_verified,
  );
  TestValidator.equals(
    "author registered_at",
    retrievedByMember.author.registered_at,
    member.registered_at,
  );
  TestValidator.equals(
    "author last_login_at",
    retrievedByMember.author.last_login_at,
    member.last_login_at,
  );
  // Validate community information
  TestValidator.equals(
    "community id",
    retrievedByMember.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name",
    retrievedByMember.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description",
    retrievedByMember.community.description,
    community.description,
  );
  TestValidator.equals(
    "community created_at",
    retrievedByMember.community.created_at,
    community.created_at,
  );
  TestValidator.equals(
    "community owner id",
    retrievedByMember.community.owner.id,
    community.owner.id,
  );
  TestValidator.predicate(
    "subscriber_count >= 1",
    retrievedByMember.community.subscriber_count >= 1,
  );
  // Validate content type is TEXT and content exists
  TestValidator.predicate("content is ICommunityPlatformPostText", () => {
    return (
      retrievedByMember.content_type === "TEXT" &&
      typeof (retrievedByMember.content as any).content === "string"
    );
  });
  // Use typia.assertGuard to narrow the type
  typia.assertGuard<ICommunityPlatformPostText>(retrievedByMember.content);
  // Validate text content matches
  const textContent = retrievedByMember.content as ICommunityPlatformPostText;
  TestValidator.equals(
    "text content",
    textContent.content,
    postTextContent.content,
  );
  TestValidator.equals("formatting", textContent.formatting, "plain");
  TestValidator.predicate("content_length > 0", textContent.content_length > 0);
  TestValidator.equals(
    "deleted_at on content should be null",
    textContent.deleted_at,
    null,
  );
  TestValidator.equals("post id in content", textContent.post.id, post.id);
  // 6. Test retrieval by guest (no authentication)
  const guestConnection: api.IConnection = { host: connection.host };
  const retrievedByGuest = await api.functional.communityPlatform.posts.at(
    guestConnection,
    { postId: post.id },
  );
  typia.assert(retrievedByGuest);
  // Guest should get same data
  TestValidator.equals("guest retrieval same id", retrievedByGuest.id, post.id);
  TestValidator.equals(
    "guest retrieval same title",
    retrievedByGuest.title,
    post.title,
  );
  TestValidator.equals(
    "guest retrieval same author id",
    retrievedByGuest.author.id,
    member.id,
  );
  TestValidator.equals(
    "guest retrieval same community id",
    retrievedByGuest.community.id,
    community.id,
  );
}