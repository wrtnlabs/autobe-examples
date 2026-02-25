import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_retrieval_performance_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection for authenticated operations
  const userConnection: api.IConnection = { host: connection.host };
  // Create user through join endpoint (no utility function available)
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "test1234",
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformUser.IJoin;
  const user = await api.functional.communityPlatform.auth.user.join(
    userConnection,
    {
      body: userJoinBody,
    },
  );
  typia.assert(user);
  // Create a test post using available utility function
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: "general", // Use a common community name that might exist
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post);
  // Generate 150+ comments using utility function
  const totalComments = 155;
  const comments: ICommunityPlatformComment[] = [];
  for (let i = 0; i < totalComments; i++) {
    const comment =
      await generate_random_community_platform_user_posts_comments_create(
        userConnection,
        {
          params: { postId: post.id },
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // Delete some comments to test filtering (every 10th comment)
  const commentsToDelete = comments.filter((_, index) => index % 10 === 0);
  for (const comment of commentsToDelete) {
    await api.functional.communityPlatform.user.posts.comments.erase(
      userConnection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  }
  const deletedCount = commentsToDelete.length;
  const activeComments = totalComments - deletedCount;
  // Test different page sizes
  const pageSizes = [10, 25, 50, 100] as const;
  for (const limit of pageSizes) {
    // Test first page
    const firstPage =
      await api.functional.communityPlatform.posts.comments.index(
        userConnection,
        {
          postId: post.id,
          body: {
            page: 1,
            limit: limit,
            sort: "new",
          } satisfies ICommunityPlatformComment.IRequest,
        },
      );
    typia.assert(firstPage);
    // Validate pagination metadata
    TestValidator.equals(
      `first page limit ${limit}`,
      firstPage.pagination.limit,
      limit,
    );
    TestValidator.equals(
      `first page current page ${limit}`,
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      `total records ${limit}`,
      firstPage.pagination.records,
      activeComments,
    );
    TestValidator.equals(
      `total pages ${limit}`,
      firstPage.pagination.pages,
      Math.ceil(activeComments / limit),
    );
    TestValidator.predicate(
      `first page data length <= limit ${limit}`,
      firstPage.data.length <= limit,
    );
    // Verify no deleted comments in results
    for (const comment of firstPage.data) {
      TestValidator.predicate(
        `comment not deleted ${limit}`,
        !comment.is_deleted,
      );
    }
    // Test middle page if it exists
    const totalPages = firstPage.pagination.pages;
    if (totalPages > 2) {
      const middlePage = Math.floor(totalPages / 2);
      const middleResult =
        await api.functional.communityPlatform.posts.comments.index(
          userConnection,
          {
            postId: post.id,
            body: {
              page: middlePage,
              limit: limit,
              sort: "new",
            } satisfies ICommunityPlatformComment.IRequest,
          },
        );
      typia.assert(middleResult);
      TestValidator.equals(
        `middle page current ${limit}`,
        middleResult.pagination.current,
        middlePage,
      );
      TestValidator.predicate(
        `middle page data not empty ${limit}`,
        middleResult.data.length > 0,
      );
    }
    // Test last page
    const lastPage =
      await api.functional.communityPlatform.posts.comments.index(
        userConnection,
        {
          postId: post.id,
          body: {
            page: totalPages,
            limit: limit,
            sort: "new",
          } satisfies ICommunityPlatformComment.IRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.equals(
      `last page current ${limit}`,
      lastPage.pagination.current,
      totalPages,
    );
    TestValidator.predicate(
      `last page data length <= limit ${limit}`,
      lastPage.data.length <= limit,
    );
    // Last page should have remaining items
    const expectedLastPageItems =
      activeComments % limit === 0 ? limit : activeComments % limit;
    TestValidator.equals(
      `last page item count ${limit}`,
      lastPage.data.length,
      expectedLastPageItems,
    );
  }
  // Test sorting algorithms
  const sortTypes = ["best", "new", "controversial"] as const;
  for (const sortType of sortTypes) {
    const sortedResults =
      await api.functional.communityPlatform.posts.comments.index(
        userConnection,
        {
          postId: post.id,
          body: {
            page: 1,
            limit: 25,
            sort: sortType,
          } satisfies ICommunityPlatformComment.IRequest,
        },
      );
    typia.assert(sortedResults);
    TestValidator.equals(
      `sort ${sortType} records`,
      sortedResults.pagination.records,
      activeComments,
    );
    TestValidator.predicate(
      `sort ${sortType} has data`,
      sortedResults.data.length > 0,
    );
    // Validate sorting order (new should be chronological)
    if (sortType === "new") {
      for (let i = 1; i < sortedResults.data.length; i++) {
        const prevDate = new Date(sortedResults.data[i - 1].created_at);
        const currDate = new Date(sortedResults.data[i].created_at);
        TestValidator.predicate(
          `new sort order chronological ${sortType}`,
          prevDate >= currDate,
        );
      }
    }
  }
  // Test boundary conditions
  // Test page beyond total pages
  const largePageResult =
    await api.functional.communityPlatform.posts.comments.index(
      userConnection,
      {
        postId: post.id,
        body: {
          page: 999,
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(largePageResult);
  TestValidator.predicate(
    "page beyond total returns empty",
    largePageResult.data.length === 0,
  );
  // Functional performance validation without timing assertions
  const performanceTest =
    await api.functional.communityPlatform.posts.comments.index(
      userConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(performanceTest);
  TestValidator.predicate(
    "large dataset query successful",
    performanceTest.data.length > 0,
  );
}
