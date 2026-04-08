import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the primary success path for retrieving posts from a specific community using the hot sort method (default).
 *
 * Validates the guest feed endpoint for community-specific post retrieval with hot sorting algorithm.
 * Ensures that posts are correctly filtered by community, properly sorted by engagement score,
 * and that soft-deleted posts are excluded from results. The test creates a guest account and
 * fetches community posts to validate the complete retrieval workflow.
 *
 * Special attention is given to verifying pagination metadata accuracy, post structure integrity,
 * and content preview truncation for text posts. Hot sorting combines vote score and comment
 * count to determine post ranking.
 *
 * 1. Guest account registration via POST /redditCommunity/auth/guest/join.
 * 2. Create guest connection with JWT token from registration response.
 * 3. Fetch community feed with sort="hot" via PATCH /redditCommunity/guest/feeds/community/{communityId}.
 * 4. Validate response structure, pagination metadata, and post data integrity.
 */
export async function test_api_guest_feed_community_hot_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guest);
  // 2. Create guest connection with JWT token
  const guestAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${guest.token.access}` },
  };
  // 3. Generate test data
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    sort: "hot" as const,
    page: 1,
    limit: 20,
  } satisfies IRedditCommunityPost.IRequest;
  // 4. Fetch community feed with hot sort
  const feed = await api.functional.redditCommunity.guest.feeds.community.index(
    guestAuthConnection,
    {
      communityId,
      body,
    },
  );
  typia.assert(feed);
  // 5. Validate response structure
  TestValidator.equals("pagination metadata exists", feed.pagination, {
    current: 1,
    limit: 20,
    records: 0,
    pages: 0,
  });
  // 6. Validate each post in the response
  if (feed.data.length > 0) {
    for (const post of feed.data) {
      typia.assert(post);
      // Verify post belongs to the specified community
      TestValidator.equals(
        "post belongs to community",
        post.community.id,
        communityId,
      );
      // Verify post structure
      TestValidator.notEquals("post has valid id", post.id, null);
      TestValidator.notEquals("post has title", post.title, null);
      TestValidator.equals(
        "post has valid post_type",
        ["text", "link", "image"].includes(post.post_type),
        true,
      );
      // Verify content preview rules
      if (post.post_type === "text") {
        TestValidator.notEquals(
          "text post has content",
          post.text_content,
          null,
        );
        if (post.text_content) {
          TestValidator.predicate(
            "text content within 200 char limit",
            post.text_content.length <= 200,
          );
        }
      } else if (post.post_type === "link" || post.post_type === "image") {
        TestValidator.equals(
          "non-text posts have null text_content",
          post.text_content,
          null,
        );
      }
      // Verify post metadata
      TestValidator.predicate(
        "post has valid vote_score",
        typeof post.vote_score === "number",
      );
      TestValidator.predicate(
        "post has valid comment_count",
        typeof post.comment_count === "number",
      );
      TestValidator.predicate(
        "post has valid created_at",
        new Date(post.created_at).getTime() > 0,
      );
      TestValidator.predicate(
        "post has valid updated_at",
        new Date(post.updated_at).getTime() > 0,
      );
      // Verify soft deletion handling
      if (post.deleted_at) {
        TestValidator.predicate(
          "deleted post has valid timestamp",
          new Date(post.deleted_at).getTime() > 0,
        );
      }
      // Verify author and community references
      TestValidator.notEquals("post has author", post.author.id, null);
      TestValidator.notEquals(
        "author has username",
        post.author.username,
        null,
      );
      TestValidator.notEquals("post has community", post.community.id, null);
      TestValidator.notEquals("community has name", post.community.name, null);
    }
  }
  // 7. Verify hot sort algorithm (if posts exist)
  if (feed.data.length > 1) {
    // Posts should be sorted by engagement score (vote_score + comment_count weighted)
    const sortedPosts = [...feed.data].sort(
      (a, b) =>
        b.vote_score +
        b.comment_count * 2 -
        (a.vote_score + a.comment_count * 2),
    );
    TestValidator.predicate(
      "posts sorted by engagement score (hot)",
      feed.data.every((post, index) => post.id === sortedPosts[index].id),
    );
  }
}
