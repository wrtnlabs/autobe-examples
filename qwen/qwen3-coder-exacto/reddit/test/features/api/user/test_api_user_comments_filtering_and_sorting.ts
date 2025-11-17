import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumPostComment";

export async function test_api_user_comments_filtering_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create a user account for authentication
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@test.com`,
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(userJoin);

  // Step 2: Create a community for our test posts
  const community = await api.functional.communityForum.user.communities.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph(),
        rules: RandomGenerator.paragraph(),
        privacy_level: "public",
        status: "active",
      } satisfies ICommunityForumCommunityGroup.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create a post to comment on
  const post = await api.functional.communityForum.user.posts.create(
    connection,
    {
      body: {
        community_forum_community_id: community.id,
        title: RandomGenerator.name(3),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityForumCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Create multiple comments with different timestamps
  const comments: ICommunityForumPostComment[] = [];
  const now = new Date();

  // Create 5 comments with different timestamps
  for (let i = 0; i < 5; i++) {
    const comment =
      await api.functional.communityForum.user.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            body: `Test comment ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
            href: "http://test.com",
            referrer: "http://referrer.com",
          } satisfies ICommunityForumPostComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  // Step 5: Test filtering by date range
  // First, test with 'after' filter - should get comments created after a certain time
  const afterDate = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
  const filteredByAfter =
    await api.functional.communityForum.users.comments.index(connection, {
      username: userJoin.username,
      body: {
        after: afterDate.toISOString(),
      } satisfies ICommunityForumPostComment.IRequest,
    });
  typia.assert(filteredByAfter);
  TestValidator.predicate(
    "filtered comments should include all recently created comments",
    () => filteredByAfter.data.length >= 5,
  );

  // Test with 'before' filter - should get comments created before now
  const beforeDate = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour from now
  const filteredByBefore =
    await api.functional.communityForum.users.comments.index(connection, {
      username: userJoin.username,
      body: {
        before: beforeDate.toISOString(),
      } satisfies ICommunityForumPostComment.IRequest,
    });
  typia.assert(filteredByBefore);
  TestValidator.predicate(
    "filtered comments should include all recently created comments",
    () => filteredByBefore.data.length >= 5,
  );

  // Step 6: Test sorting options
  // Test sorting by 'new' (default)
  const sortedByNew = await api.functional.communityForum.users.comments.index(
    connection,
    {
      username: userJoin.username,
      body: {
        sort: "new",
      } satisfies ICommunityForumPostComment.IRequest,
    },
  );
  typia.assert(sortedByNew);
  TestValidator.predicate(
    "new sort should return at least 5 comments",
    () => sortedByNew.data.length >= 5,
  );

  // Test sorting by 'top' (based on votes)
  const sortedByTop = await api.functional.communityForum.users.comments.index(
    connection,
    {
      username: userJoin.username,
      body: {
        sort: "top",
      } satisfies ICommunityForumPostComment.IRequest,
    },
  );
  typia.assert(sortedByTop);
  TestValidator.predicate(
    "top sort should return at least 5 comments",
    () => sortedByTop.data.length >= 5,
  );

  // Test sorting by 'controversial'
  const sortedByControversial =
    await api.functional.communityForum.users.comments.index(connection, {
      username: userJoin.username,
      body: {
        sort: "controversial",
      } satisfies ICommunityForumPostComment.IRequest,
    });
  typia.assert(sortedByControversial);
  TestValidator.predicate(
    "controversial sort should return at least 5 comments",
    () => sortedByControversial.data.length >= 5,
  );

  // Step 7: Test search functionality
  const searchResult = await api.functional.communityForum.users.comments.index(
    connection,
    {
      username: userJoin.username,
      body: {
        search: "Test comment 1",
      } satisfies ICommunityForumPostComment.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search should return at least 1 comment",
    () => searchResult.data.length >= 1,
  );

  // Step 8: Test pagination
  const paginatedResult =
    await api.functional.communityForum.users.comments.index(connection, {
      username: userJoin.username,
      body: {
        page: 1,
        limit: 3,
      } satisfies ICommunityForumPostComment.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination should limit results to 3 items",
    () => paginatedResult.data.length <= 3,
  );
  TestValidator.predicate(
    "pagination should include pagination info",
    () => paginatedResult.pagination !== undefined,
  );

  // Step 9: Test combining filters
  const combinedFilterResult =
    await api.functional.communityForum.users.comments.index(connection, {
      username: userJoin.username,
      body: {
        sort: "new",
        search: "Test comment",
        limit: 2,
      } satisfies ICommunityForumPostComment.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters should return at most 2 comments",
    () => combinedFilterResult.data.length <= 2,
  );
}
