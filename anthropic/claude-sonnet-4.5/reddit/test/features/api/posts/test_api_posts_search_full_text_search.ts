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
 * Test full-text search functionality using the search parameter.
 *
 * This test validates that the post search API correctly filters posts based on
 * search keywords appearing in titles or body content. It verifies
 * case-insensitive search and ensures only matching posts are returned.
 *
 * Test Flow:
 *
 * 1. Create moderator and community
 * 2. Create member account
 * 3. Create multiple posts with distinctive keywords
 * 4. Search with specific keywords
 * 5. Validate only matching posts are returned
 * 6. Test case-insensitive search
 */
export async function test_api_posts_search_full_text_search(
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

  // Step 2: Create community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create posts with distinctive keywords
  // Technology posts
  const techPost1 = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: "Advanced TypeScript programming techniques",
        post_type: "text",
        body: "This article discusses modern TypeScript development patterns and best practices for building scalable applications.",
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(techPost1);

  const techPost2 = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: "Learning JavaScript frameworks",
        post_type: "text",
        body: "A comprehensive guide to TypeScript, React, and modern web development technologies.",
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(techPost2);

  // Cooking posts
  const cookingPost1 = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: "Delicious pasta recipes for dinner",
        post_type: "text",
        body: "Learn how to make authentic Italian pasta dishes with simple ingredients and cooking techniques.",
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(cookingPost1);

  const cookingPost2 = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: "Healthy breakfast ideas",
        post_type: "text",
        body: "Start your day with nutritious meals including smoothies, oatmeal, and fresh fruit options.",
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(cookingPost2);

  // Sports post
  const sportsPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: "Basketball training tips",
        post_type: "text",
        body: "Improve your basketball skills with these professional training exercises and drills.",
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(sportsPost);

  // Step 5: Search for "TypeScript" keyword (should match techPost1 and techPost2)
  const typescriptResults = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        search: "TypeScript",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(typescriptResults);

  // Validate TypeScript search results
  const typescriptPostIds = typescriptResults.data.map((p) => p.id);
  TestValidator.predicate(
    "TypeScript search should return 2 posts",
    typescriptResults.data.length === 2,
  );
  TestValidator.predicate(
    "TypeScript search should include techPost1",
    typescriptPostIds.includes(techPost1.id),
  );
  TestValidator.predicate(
    "TypeScript search should include techPost2",
    typescriptPostIds.includes(techPost2.id),
  );
  TestValidator.predicate(
    "TypeScript search should not include cooking posts",
    !typescriptPostIds.includes(cookingPost1.id) &&
      !typescriptPostIds.includes(cookingPost2.id),
  );
  TestValidator.predicate(
    "TypeScript search should not include sports post",
    !typescriptPostIds.includes(sportsPost.id),
  );

  // Step 6: Test case-insensitive search with "typescript" (lowercase)
  const lowercaseResults = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        search: "typescript",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(lowercaseResults);

  TestValidator.predicate(
    "Lowercase 'typescript' search should return same results as 'TypeScript'",
    lowercaseResults.data.length === typescriptResults.data.length,
  );

  // Step 7: Search for "cooking" keyword (should match cookingPost1)
  const cookingResults = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        search: "cooking",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(cookingResults);

  const cookingPostIds = cookingResults.data.map((p) => p.id);
  TestValidator.predicate(
    "Cooking search should return at least 1 post",
    cookingResults.data.length >= 1,
  );
  TestValidator.predicate(
    "Cooking search should include cookingPost1",
    cookingPostIds.includes(cookingPost1.id),
  );
  TestValidator.predicate(
    "Cooking search should not include tech posts",
    !cookingPostIds.includes(techPost1.id) &&
      !cookingPostIds.includes(techPost2.id),
  );

  // Step 8: Search for "basketball" keyword (should match sportsPost only)
  const basketballResults = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        search: "basketball",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(basketballResults);

  TestValidator.predicate(
    "Basketball search should return exactly 1 post",
    basketballResults.data.length === 1,
  );
  TestValidator.equals(
    "Basketball search should return sportsPost",
    basketballResults.data[0].id,
    sportsPost.id,
  );

  // Step 9: Test case-insensitive with mixed case "BaSkEtBaLl"
  const mixedCaseResults = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        search: "BaSkEtBaLl",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(mixedCaseResults);

  TestValidator.predicate(
    "Mixed case search should be case-insensitive",
    mixedCaseResults.data.length === 1,
  );
  TestValidator.equals(
    "Mixed case search should return same result",
    mixedCaseResults.data[0].id,
    sportsPost.id,
  );
}
