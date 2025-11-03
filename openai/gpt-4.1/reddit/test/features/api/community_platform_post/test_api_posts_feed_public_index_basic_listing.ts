import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Test retrieval of a paginated, filterable list of community posts via the
 * community platform's public post feed. This test ensures:
 *
 * - The feed lists only posts from existing, non-deleted, non-archived
 *   communities
 * - Metadata and summary details are returned for each result
 * - Pagination and sorting behaviors function as specified for general feed users
 * - Soft-deleted/archived communities' posts are excluded from results
 *
 * Steps:
 *
 * 1. Register a new user (used as poster/owner)
 * 2. Create a new community (active)
 * 3. Create at least one post in the community
 * 4. Retrieve the post feed and verify returned results
 * 5. Validate pagination metadata and boundaries
 * 6. Test sort order with 'new' sort
 * 7. Check all posts/community summaries in result match expected visibility
 *    status and details
 */
export async function test_api_posts_feed_public_index_basic_listing(
  connection: api.IConnection,
) {
  // Register user
  const email: string = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      href: "https://testhost/community/register",
      referrer: "https://testhost/landing",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);

  // Create community
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(8).toLowerCase(),
        description: RandomGenerator.paragraph({
          sentences: 7,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.predicate(
    "community should not be archived/deleted",
    !community.deleted_at,
  );

  // Create post in community (text post)
  const postTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 7,
  });
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: postTitle,
        text_body: postBody,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post community_id matches",
    post.community.id,
    community.id,
  );

  // Retrieve default feed (no filter, default pagination and sort)
  const feed = await api.functional.communityPlatform.posts.index(connection, {
    body: {},
  });
  typia.assert(feed);
  TestValidator.predicate("feed has pagination info", !!feed.pagination);
  TestValidator.predicate(
    "feed has post data array",
    Array.isArray(feed.data) && feed.data.length > 0,
  );

  // Ensure created post appears in feed, status is correct, and not deleted/archived
  const found = feed.data.find((item) => item.id === post.id);
  typia.assertGuard(found!);
  TestValidator.equals("feed contains created post", found!.title, post.title);
  TestValidator.equals(
    "created post appears for correct community",
    found!.community.id,
    community.id,
  );
  TestValidator.predicate(
    "post status is not deleted",
    found!.status !== "deleted",
  );
  TestValidator.predicate(
    "post status is not archived",
    found!.status !== "archived",
  );
  TestValidator.predicate(
    "community summary present",
    typeof found!.community.name === "string",
  );

  // Test pagination (limit=1, page=1, page=2)
  const paginated1 = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: { limit: 1, page: 1 },
    },
  );
  typia.assert(paginated1);
  TestValidator.equals("pagination limit respected", paginated1.data.length, 1);
  TestValidator.equals(
    "pagination current page = 1",
    paginated1.pagination.current,
    1,
  );

  // Request page 2 for edge bound check
  const paginated2 = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: { limit: 1, page: 2 },
    },
  );
  typia.assert(paginated2);
  TestValidator.equals(
    "pagination limit respected page 2",
    paginated2.data.length,
    Math.min(1, paginated2.pagination.records - 1),
  );
  TestValidator.equals(
    "pagination current page = 2",
    paginated2.pagination.current,
    2,
  );

  // Test sort: sort=new
  const feedSorted = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: { sort: "new" },
    },
  );
  typia.assert(feedSorted);
  TestValidator.predicate(
    "posts should be in reverse chronological order (sort=new)",
    feedSorted.data.length < 2 ||
      feedSorted.data.every(
        (item, i, arr) => i === 0 || item.created_at <= arr[i - 1].created_at,
      ),
  );

  // Ensure all returned posts' communities are present and active
  for (const item of feedSorted.data) {
    TestValidator.predicate(
      "community is present in summary",
      !!item.community.description && !!item.community.name,
    );
    TestValidator.predicate(
      "post is not deleted/archived",
      item.status !== "deleted" && item.status !== "archived",
    );
  }
}
