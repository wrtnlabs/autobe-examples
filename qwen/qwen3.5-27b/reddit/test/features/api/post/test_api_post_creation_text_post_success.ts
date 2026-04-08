import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test successful creation of a text post by an authenticated member in a subscribed community.
 *
 * Validates the complete text post creation workflow including member authentication, community subscription, and post creation. Ensures that text posts are correctly created with proper content fields, initial vote/comment counts, and author/community references.
 *
 * Special attention is given to verifying that text-specific fields (text_content) are populated correctly while link and image fields remain null, and that initial post state shows zero votes and comments.
 *
 * 1. Register and authenticate a new member account.
 * 2. Subscribe the member to a community (required for post creation).
 * 3. Create a text post with title, post_type="text", and text_content.
 * 4. Validate post response structure and content accuracy.
 */
export async function test_api_post_creation_text_post_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Subscribe member to a community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {},
    );
  typia.assert(subscription);
  // 3. Create a text post
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: postTitle,
        post_type: "text",
        community_id: subscription.community.id,
        text_content: postContent,
      },
    },
  );
  typia.assert(post);
  // 4. Validate post structure and business logic
  TestValidator.predicate(
    "post has valid UUID id",
    /^[0-9a-f-]{36}$/i.test(post.id),
  );
  TestValidator.equals("post type is text", post.post_type, "text");
  TestValidator.equals("title matches input", post.title, postTitle);
  TestValidator.equals(
    "text content matches input",
    post.text_content,
    postContent,
  );
  TestValidator.equals("link_url is null for text post", post.link_url, null);
  TestValidator.equals("image_url is null for text post", post.image_url, null);
  TestValidator.equals("deleted_at is null", post.deleted_at, null);
  TestValidator.equals("initial vote_score is 0", post.vote_score, 0);
  TestValidator.equals("initial comment_count is 0", post.comment_count, 0);
  TestValidator.equals(
    "author matches member username",
    post.author.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "community matches subscription",
    post.community.id,
    subscription.community.id,
  );
}
