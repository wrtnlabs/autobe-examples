import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test filtering comments by text content using the search query parameter.
 *
 * This scenario validates that the comment search functionality correctly
 * filters comments based on case-insensitive substring matching. The test
 * verifies that:
 *
 * 1. A community and post are created
 * 2. Multiple comments with different text content are added
 * 3. Comments can be filtered using the search parameter with case-insensitive
 *    substring matching
 * 4. Only comments containing the search term are returned
 * 5. Search results are properly paginated
 * 6. Empty search results return an empty data array with correct pagination
 *    metadata
 */
export async function test_api_comments_retrieval_with_text_search(
  connection: api.IConnection,
) {
  // Step 1: Create moderator and authenticate
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ModeratorPass123!",
    nickname: RandomGenerator.name(),
    ip: "192.168.1.1",
    href: "https://example.com/moderator/join" satisfies string &
      tags.Format<"uri">,
    referrer: "" satisfies string & tags.Format<"uri">,
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    rules: RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create member and authenticate
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass123!",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: true,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: "192.168.1.2",
    href: "https://example.com/member/join" satisfies string &
      tags.Format<"uri">,
    referrer: "" satisfies string & tags.Format<"uri">,
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Member creates a text post
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Create multiple comments with distinct searchable text
  const searchableKeywords = [
    "TypeScript",
    "JavaScript",
    "Python",
    "Java",
    "Golang",
  ];
  const comments: IRedditCommunityComment[] = [];

  for (const keyword of searchableKeywords) {
    const commentBody = `This is a comment about ${keyword} programming language. ${RandomGenerator.paragraph({ sentences: 2 })}`;

    const commentData = {
      body: commentBody,
      parent_comment_id: null,
    } satisfies IRedditCommunityComment.ICreate;

    const comment: IRedditCommunityComment =
      await api.functional.redditCommunity.member.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: commentData,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  // Add some comments without specific keywords
  const genericComments = ArrayUtil.repeat(2, () => {
    return RandomGenerator.paragraph({ sentences: 3 });
  });

  for (const genericBody of genericComments) {
    const commentData = {
      body: genericBody,
      parent_comment_id: null,
    } satisfies IRedditCommunityComment.ICreate;

    const comment: IRedditCommunityComment =
      await api.functional.redditCommunity.member.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: commentData,
        },
      );
    typia.assert(comment);
  }

  // Step 6: Test case-insensitive search for "typescript"
  const searchRequest1 = {
    search: "typescript",
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityComment.IRequest;

  const searchResult1: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId: post.id,
      body: searchRequest1,
    });
  typia.assert(searchResult1);

  // Validate that only TypeScript comment is returned
  TestValidator.equals(
    "search for 'typescript' returns 1 result",
    searchResult1.data.length,
    1,
  );
  TestValidator.predicate(
    "returned comment contains 'TypeScript'",
    searchResult1.data[0].body.includes("TypeScript"),
  );

  // Step 7: Test case-insensitive search with uppercase
  const searchRequest2 = {
    search: "JAVASCRIPT",
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityComment.IRequest;

  const searchResult2: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId: post.id,
      body: searchRequest2,
    });
  typia.assert(searchResult2);

  TestValidator.equals(
    "search for 'JAVASCRIPT' returns 1 result",
    searchResult2.data.length,
    1,
  );
  TestValidator.predicate(
    "returned comment contains 'JavaScript'",
    searchResult2.data[0].body.includes("JavaScript"),
  );

  // Step 8: Test partial substring search
  const searchRequest3 = {
    search: "programming",
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityComment.IRequest;

  const searchResult3: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId: post.id,
      body: searchRequest3,
    });
  typia.assert(searchResult3);

  // All keyword comments contain "programming"
  TestValidator.equals(
    "search for 'programming' returns 5 results",
    searchResult3.data.length,
    5,
  );

  // Step 9: Test pagination
  const searchRequest4 = {
    search: "programming",
    page: 1,
    limit: 2,
  } satisfies IRedditCommunityComment.IRequest;

  const searchResult4: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId: post.id,
      body: searchRequest4,
    });
  typia.assert(searchResult4);

  TestValidator.equals(
    "pagination limit respected",
    searchResult4.data.length,
    2,
  );
  TestValidator.equals(
    "pagination metadata shows correct total records",
    searchResult4.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination metadata shows correct total pages",
    searchResult4.pagination.pages,
    3,
  );

  // Step 10: Test empty search results
  const searchRequest5 = {
    search: "NonExistentKeyword12345",
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityComment.IRequest;

  const searchResult5: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId: post.id,
      body: searchRequest5,
    });
  typia.assert(searchResult5);

  TestValidator.equals(
    "search with no matches returns empty array",
    searchResult5.data.length,
    0,
  );
  TestValidator.equals(
    "empty search has zero total records",
    searchResult5.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search has zero total pages",
    searchResult5.pagination.pages,
    0,
  );
}
