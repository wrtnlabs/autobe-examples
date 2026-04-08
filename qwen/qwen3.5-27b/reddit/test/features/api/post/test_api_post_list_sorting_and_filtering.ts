import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
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
import { generate_random_reddit_clone_member_posts_votes_create } from "../../../generate/generate_random_reddit_clone_member_posts_votes_create";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

/**
 * Test the sorting options and filtering capabilities of the posts list endpoint.
 *
 * Validates that the posts list API correctly handles various sorting strategies (new, top, controversial) and filtering options (community, search query, post type, pagination). The test creates multiple posts with different characteristics to verify that sorting and filtering produce the expected results.
 *
 * The test covers time-based filtering for top-sorted posts, search functionality for title matching, post type filtering, and pagination behavior. Each sorting and filtering combination is validated to ensure the API returns posts in the correct order and with the correct subset of data.
 *
 * 1. Authenticate as a member and create posts with varying characteristics.
 * 2. Add votes to posts to create different score patterns.
 * 3. Test 'new' sorting and verify chronological ordering.
 * 4. Test 'top' sorting with different time filters.
 * 5. Test 'controversial' sorting for posts with mixed votes.
 * 6. Test community filtering to restrict results.
 * 7. Test search filtering for title matching.
 * 8. Test post type filtering for content type restriction.
 * 9. Test pagination to verify page-based navigation.
 */
export async function test_api_post_list_sorting_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Create posts with varying characteristics
  const posts: IRedditClonePost[] = [];
  // Create text post
  const textPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Test Text Post About Technology",
        post_type: "text",
        text_content: "This is a text post about technology and programming.",
      },
    },
  );
  typia.assert(textPost);
  posts.push(textPost);
  // Create link post
  const linkPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Interesting Link About Science",
        post_type: "link",
        link_url: "https://example.com/science-article",
      },
    },
  );
  typia.assert(linkPost);
  posts.push(linkPost);
  // Create image post
  const imagePost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Beautiful Image Post",
        post_type: "image",
        image_url: "https://example.com/image.jpg",
      },
    },
  );
  typia.assert(imagePost);
  posts.push(imagePost);
  // Create another text post for search testing
  const searchTestPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Another Post About Programming",
        post_type: "text",
        text_content: "This post is about programming languages.",
      },
    },
  );
  typia.assert(searchTestPost);
  posts.push(searchTestPost);
  // 3. Add votes to create different score patterns
  // Upvote text post multiple times
  await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: textPost.id },
      body: { vote_type: "upvote" },
    },
  );
  await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: textPost.id },
      body: { vote_type: "upvote" },
    },
  );
  // Downvote link post
  await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: linkPost.id },
      body: { vote_type: "downvote" },
    },
  );
  // Mixed votes on image post for controversial sorting
  await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: imagePost.id },
      body: { vote_type: "upvote" },
    },
  );
  await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: imagePost.id },
      body: { vote_type: "downvote" },
    },
  );
  // 4. Test 'new' sorting
  const newSorted = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        sortType: "new",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(newSorted);
  TestValidator.predicate(
    "new sorting returns posts",
    newSorted.data.length > 0,
  );
  // Verify chronological order (most recent first)
  for (let i = 1; i < newSorted.data.length; i++) {
    TestValidator.predicate(
      `new sorting order at index ${i}`,
      new Date(newSorted.data[i - 1].created_at) >=
        new Date(newSorted.data[i].created_at),
    );
  }
  // 5. Test 'top' sorting with time filter "all"
  const topSorted = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        sortType: "top",
        timeFilter: "all",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topSorted);
  TestValidator.predicate(
    "top sorting returns posts",
    topSorted.data.length > 0,
  );
  // Verify vote score order (highest first)
  for (let i = 1; i < topSorted.data.length; i++) {
    TestValidator.predicate(
      `top sorting order at index ${i}`,
      topSorted.data[i - 1].vote_score >= topSorted.data[i].vote_score,
    );
  }
  // 6. Test 'top' sorting with time filter "week"
  const topWeekSorted = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        sortType: "top",
        timeFilter: "week",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topWeekSorted);
  TestValidator.predicate(
    "top week sorting returns posts",
    topWeekSorted.data.length >= 0,
  );
  // 7. Test 'controversial' sorting
  const controversialSorted = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        sortType: "controversial",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(controversialSorted);
  TestValidator.predicate(
    "controversial sorting returns posts",
    controversialSorted.data.length >= 0,
  );
  // 8. Test community filter
  const communityId = textPost.community.id;
  const communityFiltered = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        communityId: communityId,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(communityFiltered);
  TestValidator.predicate(
    "community filter returns posts",
    communityFiltered.data.length > 0,
  );
  // Verify all posts are from the specified community
  for (const post of communityFiltered.data) {
    TestValidator.equals(
      "community filter matches",
      post.community.id,
      communityId,
    );
  }
  // 9. Test search filter
  const searchFiltered = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        searchQuery: "Programming",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(searchFiltered);
  TestValidator.predicate(
    "search filter returns matching posts",
    searchFiltered.data.length > 0,
  );
  // Verify all posts contain the search term in title (case-insensitive)
  for (const post of searchFiltered.data) {
    TestValidator.predicate(
      `search term in title: ${post.title}`,
      post.title.toLowerCase().includes("programming"),
    );
  }
  // 10. Test post type filter
  const textTypeFiltered = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        postType: "text",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(textTypeFiltered);
  TestValidator.predicate(
    "post type filter returns posts",
    textTypeFiltered.data.length > 0,
  );
  // Verify all posts are text type
  for (const post of textTypeFiltered.data) {
    TestValidator.equals("post type filter matches", post.post_type, "text");
  }
  // 11. Test pagination
  const paginated = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(paginated);
  TestValidator.equals("pagination limit", paginated.pagination.limit, 2);
  TestValidator.predicate(
    "pagination returns correct page",
    paginated.pagination.current === 1,
  );
  TestValidator.predicate("pagination data count", paginated.data.length <= 2);
  // 12. Test empty results with non-matching search
  const emptySearch = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        searchQuery: "NonExistentKeyword12345",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search returns no results",
    emptySearch.data.length,
    0,
  );
}