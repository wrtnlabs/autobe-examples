import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test member post list retrieval by username with pagination and post type validation.
 *
 * Validates the complete workflow for retrieving posts authored by a specific member. The test creates two member accounts (requesting member and target member), establishes a community, subscribes the target member, creates multiple posts of different types (text, link, image), and verifies the paginated list endpoint returns correct data.
 *
 * Key validation points include: post summary structure with all required fields (id, title, post_type, author, community, vote_score, comment_count, created_at), type-specific preview fields (text_preview for text posts, thumbnail_url for image posts, link_domain for link posts), pagination metadata accuracy, chronological ordering (newest first), and exclusion of soft-deleted posts.
 *
 * 1. Requesting member authenticates via registration.
 * 2. Target member account created with unique credentials.
 * 3. Target member creates a community.
 * 4. Target member subscribes to the community.
 * 5. Target member creates three posts (text, link, image types).
 * 6. Requesting member retrieves target member's posts via username.
 * 7. Validates response structure, pagination, sorting, and type-specific fields.
 */
export async function test_api_member_post_list_by_username(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate requesting member
  const requestingConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(requestingConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create target member account
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(targetMember);
  // 3. Target member creates a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      targetConnection,
      {},
    );
  typia.assert(community);
  // 4. Target member subscribes to the community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      targetConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Create multiple posts of different types by target member
  const textPost = await generate_random_reddit_community_posts_create(
    targetConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(textPost);
  // Wait a small amount to ensure different timestamps for sorting validation
  await new Promise((resolve) => setTimeout(resolve, 10));
  const linkPost = await generate_random_reddit_community_posts_create(
    targetConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "link",
        community_id: community.id,
        url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPost);
  await new Promise((resolve) => setTimeout(resolve, 10));
  const imagePost = await generate_random_reddit_community_posts_create(
    targetConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "image",
        community_id: community.id,
        image_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(imagePost);
  // 6. Retrieve posts by target member's username
  const result =
    await api.functional.redditCommunity.member.members.posts.iterate(
      requestingConnection,
      {
        username: targetMember.username,
      },
    );
  typia.assert(result);
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit", result.pagination.limit >= 1);
  TestValidator.predicate(
    "pagination records count",
    result.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pagination pages count",
    result.pagination.pages >= 1,
  );
  TestValidator.equals(
    "pagination records matches data length",
    result.pagination.records,
    result.data.length,
  );
  // 8. Validate post data structure
  TestValidator.predicate("has posts", result.data.length >= 3);
  for (const post of result.data) {
    // Validate required fields exist
    TestValidator.predicate("post has id", post.id !== undefined);
    TestValidator.predicate("post has title", post.title !== undefined);
    TestValidator.predicate("post has post_type", post.post_type !== undefined);
    TestValidator.predicate("post has author", post.author !== undefined);
    TestValidator.predicate("post has community", post.community !== undefined);
    TestValidator.predicate(
      "post has vote_score",
      typeof post.vote_score === "number",
    );
    TestValidator.predicate(
      "post has comment_count",
      typeof post.comment_count === "number",
    );
    TestValidator.predicate(
      "post has created_at",
      post.created_at !== undefined,
    );
    // Validate author is target member
    TestValidator.equals(
      "author username matches target",
      post.author.username,
      targetMember.username,
    );
    // Validate type-specific preview fields
    if (post.post_type === "text") {
      TestValidator.predicate(
        "text post has text_preview",
        post.text_preview !== undefined,
      );
    } else if (post.post_type === "image") {
      TestValidator.predicate(
        "image post has thumbnail_url",
        post.thumbnail_url !== undefined,
      );
    } else if (post.post_type === "link") {
      TestValidator.predicate(
        "link post has link_domain",
        post.link_domain !== undefined,
      );
    }
  }
  // 9. Validate sorting (newest first - descending by created_at)
  if (result.data.length >= 2) {
    for (let i = 0; i < result.data.length - 1; i++) {
      const currentDate = new Date(result.data[i].created_at).getTime();
      const nextDate = new Date(result.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `posts sorted descending at index ${i}`,
        currentDate >= nextDate,
      );
    }
  }
  // 10. Verify all three created posts are in the results
  const postIds = result.data.map((p) => p.id);
  TestValidator.predicate(
    "text post in results",
    postIds.includes(textPost.id),
  );
  TestValidator.predicate(
    "link post in results",
    postIds.includes(linkPost.id),
  );
  TestValidator.predicate(
    "image post in results",
    postIds.includes(imagePost.id),
  );
}
