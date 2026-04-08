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
 * Test that an authenticated member can successfully create a link post in a subscribed community.
 *
 * Validates the complete link post creation workflow including member registration, community subscription, and post creation. Ensures that link posts are properly created with the correct post_type discriminator and that all nullable fields are appropriately set to null.
 *
 * Special attention is given to verifying that the link_url is stored correctly, text_content and image_url are null, and the post is properly associated with both the author and community.
 *
 * 1. Register and authenticate as a new member.
 * 2. Subscribe the member to a community.
 * 3. Create a link post with title, link_url, and post_type "link".
 * 4. Validate post structure, fields, and relationships.
 */
export async function test_api_post_creation_link_post_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Subscribe the member to a community
  const subscription: IRedditCloneCommunitySubscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {},
    );
  typia.assert(subscription);
  // 3. Create a link post
  const post: IRedditClonePost =
    await generate_random_reddit_clone_member_posts_create(memberConnection, {
      body: {
        title: "Interesting Article About Reddit Clones",
        post_type: "link",
        community_id: subscription.community.id,
        link_url: "https://example.com/article-about-reddit-clones",
      } satisfies IRedditClonePost.ICreate,
    });
  typia.assert(post);
  // 4. Validate post structure and fields
  TestValidator.equals("post has UUID id", typeof post.id, "string");
  TestValidator.equals(
    "title matches input",
    post.title,
    "Interesting Article About Reddit Clones",
  );
  TestValidator.equals("post_type is link", post.post_type, "link");
  TestValidator.equals(
    "link_url matches input",
    post.link_url,
    "https://example.com/article-about-reddit-clones",
  );
  TestValidator.equals("text_content is null", post.text_content, null);
  TestValidator.equals("image_url is null", post.image_url, null);
  TestValidator.equals("deleted_at is null", post.deleted_at, null);
  TestValidator.equals("vote_score is 0", post.vote_score, 0);
  TestValidator.equals("comment_count is 0", post.comment_count, 0);
  TestValidator.predicate(
    "created_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      post.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      post.updated_at,
    ),
  );
  TestValidator.equals(
    "author id matches member",
    post.author.id,
    subscription.member.id,
  );
  TestValidator.equals(
    "community id matches subscription",
    post.community.id,
    subscription.community.id,
  );
}
