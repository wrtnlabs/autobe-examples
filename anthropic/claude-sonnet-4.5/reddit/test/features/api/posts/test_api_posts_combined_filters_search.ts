import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test combining multiple filter parameters in a single search request.
 *
 * This test validates the post search endpoint's ability to handle complex
 * queries combining community filtering, post type filtering, vote score
 * filtering, text search, and sorting. It ensures all filter criteria are
 * applied with AND logic and that sorting works correctly on the filtered
 * subset.
 *
 * Test workflow:
 *
 * 1. Create moderator and community
 * 2. Create member account for posting
 * 3. Create diverse posts with varied attributes
 * 4. Execute combined filter search
 * 5. Validate all results match ALL filter criteria
 * 6. Verify correct sorting of filtered results
 */
export async function test_api_posts_combined_filters_search(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create test community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-z0-9_]+$">
          >(),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create diverse posts with specific search terms
  const searchTerm = "typescript";
  const createdPosts: IRedditCommunityPost[] = [];

  // Create text posts that match our search criteria
  for (let i = 0; i < 3; i++) {
    const post = await api.functional.redditCommunity.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          title: `Learning ${searchTerm} fundamentals ${i + 1}`,
          post_type: "text",
          body: `This is a comprehensive guide about ${searchTerm} programming`,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
    createdPosts.push(post);
  }

  // Create text posts that do NOT match search criteria
  for (let i = 0; i < 2; i++) {
    const post = await api.functional.redditCommunity.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          title: `Random topic ${i + 1}`,
          post_type: "text",
          body: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
  }

  // Create link posts (different type, should be filtered out)
  for (let i = 0; i < 2; i++) {
    const post = await api.functional.redditCommunity.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          title: `Link about ${searchTerm} ${i + 1}`,
          post_type: "link",
          url: typia.random<
            string & tags.MaxLength<2000> & tags.Format<"uri">
          >(),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
  }

  // Step 5: Execute combined filter search
  const searchResult = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        min_vote_score: 0,
        search: searchTerm,
        sort_by: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(searchResult);

  // Step 6: Validate all filter criteria are applied
  TestValidator.equals(
    "search should return exactly 3 matching posts",
    searchResult.data.length,
    3,
  );

  // Validate each result matches ALL filter criteria
  for (const post of searchResult.data) {
    TestValidator.equals(
      "post belongs to correct community",
      post.community.id,
      community.id,
    );

    TestValidator.equals("post type is text", post.post_type, "text");

    TestValidator.predicate(
      "post meets minimum vote score requirement",
      post.vote_score >= 0,
    );

    TestValidator.predicate(
      "post title contains search term",
      post.title.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }

  // Step 7: Verify sorting (new = chronological descending by created_at)
  for (let i = 0; i < searchResult.data.length - 1; i++) {
    const current = new Date(searchResult.data[i].created_at).getTime();
    const next = new Date(searchResult.data[i + 1].created_at).getTime();

    TestValidator.predicate(
      "posts are sorted by creation date descending (newest first)",
      current >= next,
    );
  }

  // Step 8: Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    searchResult.pagination.current,
    0,
  );

  TestValidator.equals(
    "pagination limit is respected",
    searchResult.pagination.limit,
    10,
  );

  TestValidator.predicate(
    "pagination records count is reasonable",
    searchResult.pagination.records >= 3,
  );
}
