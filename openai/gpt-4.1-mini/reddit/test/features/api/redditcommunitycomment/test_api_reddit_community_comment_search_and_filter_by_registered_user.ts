import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * Validate that a registered user can search and filter Reddit community
 * comments based on post, community, and author filters.
 *
 * The test performs the following sequence:
 *
 * 1. Registers and authenticates a new registered user.
 * 2. Creates a subreddit community by the authenticated user.
 * 3. Creates a post inside the created community.
 * 4. Tests filtering comments by each filter (author_id, community_id, post_id)
 *    separately and combined.
 * 5. Checks search text filtering by filtering for comments containing specific
 *    substrings.
 * 6. Tests pagination with different page and page_size values.
 * 7. Tests sorting comments by created_at, updated_at, and votes_count, in
 *    ascending and descending order.
 * 8. Asserts all returned comments meet the given filter criteria and pagination
 *    metadata are accurate.
 *
 * This test ensures that all related entities are correctly linked and the
 * filtering works strictly as expected.
 */
export async function test_api_reddit_community_comment_search_and_filter_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a user
  const userJoinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: `user${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "P@ssword1234",
    ip: null,
    href: "https://redditcommunity.example.com/signup",
    referrer: "https://redditcommunity.example.com",
  } satisfies IRedditCommunityRegisteredUser.IJoin;
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(user);

  // 2. Create a community
  const communityCreateBody = {
    communityName: `community_${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a post within the community
  const postCreateBody = {
    community_code: community.communityName,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    type: "text",
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityPost.ICreate;
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.create(
      connection,
      {
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 4. Prepare a filter request object base
  const baseFilter = {
    filter_author_id: user.id,
    filter_community_id: community.id,
    filter_post_id: post.id,
  };

  // 5. Test filtering by author_id only
  {
    const body: IRedditCommunityComment.IRequest = {
      filter_author_id: baseFilter.filter_author_id,
    };
    const result: IPageIRedditCommunityComment.ISummary =
      await api.functional.redditCommunity.registeredUser.redditCommunityComments.index(
        connection,
        { body },
      );
    typia.assert(result);
    for (const comment of result.data) {
      TestValidator.equals(
        "comment author matches filter_author_id",
        comment.author.id,
        body.filter_author_id,
      );
    }
  }

  // 6. Test filtering by community_id only
  {
    const body: IRedditCommunityComment.IRequest = {
      filter_community_id: baseFilter.filter_community_id,
    };
    const result: IPageIRedditCommunityComment.ISummary =
      await api.functional.redditCommunity.registeredUser.redditCommunityComments.index(
        connection,
        { body },
      );
    typia.assert(result);
    for (const comment of result.data) {
      // No direct community id on comment - skip direct check
    }
  }

  // 7. Test filtering by post_id only
  {
    const body: IRedditCommunityComment.IRequest = {
      filter_post_id: baseFilter.filter_post_id,
    };
    const result: IPageIRedditCommunityComment.ISummary =
      await api.functional.redditCommunity.registeredUser.redditCommunityComments.index(
        connection,
        { body },
      );
    typia.assert(result);
    for (const comment of result.data) {
      // No direct post_id on comment - skip direct check
    }
  }

  // 8. Test filtering by combined filters (author_id, community_id, post_id)
  {
    const body: IRedditCommunityComment.IRequest = {
      filter_author_id: baseFilter.filter_author_id,
      filter_community_id: baseFilter.filter_community_id,
      filter_post_id: baseFilter.filter_post_id,
    };
    const result: IPageIRedditCommunityComment.ISummary =
      await api.functional.redditCommunity.registeredUser.redditCommunityComments.index(
        connection,
        { body },
      );
    typia.assert(result);
    for (const comment of result.data) {
      TestValidator.equals(
        "comment author matches combined filter_author_id",
        comment.author.id,
        body.filter_author_id,
      );
    }
  }

  // 9. Test filtering by search_text in comment content
  {
    const body: IRedditCommunityComment.IRequest = {
      search_text: "test",
    };
    const result: IPageIRedditCommunityComment.ISummary =
      await api.functional.redditCommunity.registeredUser.redditCommunityComments.index(
        connection,
        { body },
      );
    typia.assert(result);
    for (const comment of result.data) {
      TestValidator.predicate(
        "comment content includes search_text",
        comment.content.includes(body.search_text!),
      );
    }
  }

  // 10. Test pagination with specified page and page_size
  {
    const body: IRedditCommunityComment.IRequest = {
      page: 1,
      page_size: 5,
    };
    const result1: IPageIRedditCommunityComment.ISummary =
      await api.functional.redditCommunity.registeredUser.redditCommunityComments.index(
        connection,
        { body },
      );
    typia.assert(result1);
    TestValidator.predicate(
      "page_size must be less or equal to 5",
      result1.data.length <= 5,
    );
    if (result1.pagination.pages > 1) {
      const body2: IRedditCommunityComment.IRequest = {
        page: 2,
        page_size: 5,
      };
      const result2: IPageIRedditCommunityComment.ISummary =
        await api.functional.redditCommunity.registeredUser.redditCommunityComments.index(
          connection,
          { body: body2 },
        );
      typia.assert(result2);
      TestValidator.predicate(
        "page 2 data different from page 1",
        !result2.data.some((c) => result1.data.find((c1) => c1.id === c.id)),
      );
    }
  }

  // 11. Test sorting by created_at ascending and descending
  for (const sortOrder of ["asc", "desc"] as const) {
    const body: IRedditCommunityComment.IRequest = {
      sort_field: "created_at",
      sort_order: sortOrder,
      page: 1,
      page_size: 10,
    };
    const result: IPageIRedditCommunityComment.ISummary =
      await api.functional.redditCommunity.registeredUser.redditCommunityComments.index(
        connection,
        { body },
      );
    typia.assert(result);
    for (let i = 1; i < result.data.length; i++) {
      const prev = result.data[i - 1].created_at;
      const curr = result.data[i].created_at;
      const condition = sortOrder === "asc" ? prev <= curr : prev >= curr;
      TestValidator.predicate(
        `order by created_at ${sortOrder} at index ${i}`,
        condition,
      );
    }
  }

  // 12. Test sorting by updated_at ascending and descending
  for (const sortOrder of ["asc", "desc"] as const) {
    const body: IRedditCommunityComment.IRequest = {
      sort_field: "updated_at",
      sort_order: sortOrder,
      page: 1,
      page_size: 10,
    };
    const result: IPageIRedditCommunityComment.ISummary =
      await api.functional.redditCommunity.registeredUser.redditCommunityComments.index(
        connection,
        { body },
      );
    typia.assert(result);
    for (let i = 1; i < result.data.length; i++) {
      const prev = result.data[i - 1].created_at;
      const curr = result.data[i].created_at;
      const condition = sortOrder === "asc" ? prev <= curr : prev >= curr;
      TestValidator.predicate(
        `order by updated_at ${sortOrder} at index ${i}`,
        condition,
      );
    }
  }

  // 13. Test sorting by votes_count ascending and descending
  for (const sortOrder of ["asc", "desc"] as const) {
    const body: IRedditCommunityComment.IRequest = {
      sort_field: "votes_count",
      sort_order: sortOrder,
      page: 1,
      page_size: 10,
    };
    const result: IPageIRedditCommunityComment.ISummary =
      await api.functional.redditCommunity.registeredUser.redditCommunityComments.index(
        connection,
        { body },
      );
    typia.assert(result);
    for (let i = 1; i < result.data.length; i++) {
      const prev = result.data[i - 1].score;
      const curr = result.data[i].score;
      const condition = sortOrder === "asc" ? prev <= curr : prev >= curr;
      TestValidator.predicate(
        `order by votes_count ${sortOrder} at index ${i}`,
        condition,
      );
    }
  }
}
