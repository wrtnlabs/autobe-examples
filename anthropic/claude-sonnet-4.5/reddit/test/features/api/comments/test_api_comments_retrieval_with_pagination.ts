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
 * Test paginated retrieval of comments with configurable page sizes and
 * navigation through large comment threads.
 *
 * This test validates the pagination system for comment lists including page
 * size limits, page navigation, and accurate pagination metadata. The test
 * verifies that:
 *
 * 1. A community and post are created
 * 2. Multiple comments are added to the post (more than the page limit)
 * 3. Comments can be retrieved with specified page number and limit parameters
 * 4. The pagination metadata correctly reflects current page, total records, total
 *    pages, and page size
 * 5. Subsequent pages return the correct subset of comments
 * 6. The maximum page size limit (100) is enforced
 *
 * This tests efficient navigation through large discussion threads.
 */
export async function test_api_comments_retrieval_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community as moderator
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: "member123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create multiple comments (30 comments to test pagination)
  const totalComments = 30;
  const createdComments: IRedditCommunityComment[] = [];

  for (let i = 0; i < totalComments; i++) {
    const comment =
      await api.functional.redditCommunity.member.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            body: RandomGenerator.paragraph({ sentences: 3 }),
            parent_comment_id: null,
          } satisfies IRedditCommunityComment.ICreate,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }

  // Step 6: Test pagination with page size 10
  const pageSize10 = await api.functional.redditCommunity.posts.comments.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(pageSize10);

  // Validate pagination metadata for page 1 with limit 10
  TestValidator.equals("page 1 current page", pageSize10.pagination.current, 0);
  TestValidator.equals("page 1 limit", pageSize10.pagination.limit, 10);
  TestValidator.equals(
    "page 1 total records",
    pageSize10.pagination.records,
    totalComments,
  );
  TestValidator.equals("page 1 total pages", pageSize10.pagination.pages, 3);
  TestValidator.equals("page 1 data length", pageSize10.data.length, 10);

  // Step 7: Test second page with limit 10
  const page2Size10 = await api.functional.redditCommunity.posts.comments.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 2,
        limit: 10,
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(page2Size10);

  TestValidator.equals(
    "page 2 current page",
    page2Size10.pagination.current,
    1,
  );
  TestValidator.equals("page 2 limit", page2Size10.pagination.limit, 10);
  TestValidator.equals("page 2 data length", page2Size10.data.length, 10);

  // Step 8: Test third page with limit 10
  const page3Size10 = await api.functional.redditCommunity.posts.comments.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 3,
        limit: 10,
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(page3Size10);

  TestValidator.equals(
    "page 3 current page",
    page3Size10.pagination.current,
    2,
  );
  TestValidator.equals("page 3 data length", page3Size10.data.length, 10);

  // Step 9: Test with different page size (20)
  const pageSize20 = await api.functional.redditCommunity.posts.comments.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(pageSize20);

  TestValidator.equals(
    "limit 20 current page",
    pageSize20.pagination.current,
    0,
  );
  TestValidator.equals("limit 20 limit", pageSize20.pagination.limit, 20);
  TestValidator.equals("limit 20 total pages", pageSize20.pagination.pages, 2);
  TestValidator.equals("limit 20 data length", pageSize20.data.length, 20);

  // Step 10: Test maximum page size limit (100)
  const pageSize100 = await api.functional.redditCommunity.posts.comments.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(pageSize100);

  TestValidator.equals("limit 100 limit", pageSize100.pagination.limit, 100);
  TestValidator.equals(
    "limit 100 data length",
    pageSize100.data.length,
    totalComments,
  );
  TestValidator.predicate(
    "all comments fit in one page",
    pageSize100.pagination.pages === 1,
  );

  // Step 11: Verify no duplicate comments across pages
  const allFirstPageIds = pageSize10.data.map((c) => c.id);
  const allSecondPageIds = page2Size10.data.map((c) => c.id);

  const hasNoDuplicates = allFirstPageIds.every(
    (id) => !allSecondPageIds.includes(id),
  );
  TestValidator.predicate(
    "no duplicate comments across pages",
    hasNoDuplicates,
  );
}
