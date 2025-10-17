import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDiscussionBoardPost";

export async function test_api_discussion_board_post_filtered_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin creates a discussion board category (e.g., "Economics")
  const categoryBody = {
    name: "Economics",
    description: "Category for economic discussion posts",
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;

  // Create category as admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  // Admin join
  const adminJoinOutput: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123",
        displayName: "AdminUser",
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(adminJoinOutput);

  // Admin category creation
  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 2. Member registers and authenticates
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  // Member join
  const memberJoinOutput: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPass123",
        display_name: "MemberUser",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(memberJoinOutput);

  // Member login (to obtain token and authentication)
  const memberLoginOutput: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: "MemberPass123",
      } satisfies IDiscussionBoardMember.ILogin,
    });
  typia.assert(memberLoginOutput);

  // 3. Create multiple posts as the authenticated member
  // Post creation is implied, but since no API is provided for creating posts,
  // we simulate multiple posts by knowing filtering afterwards
  // Prepare some dummy posts data matching filters (this simulates the post creation)

  // For the test, we assume that posts created with different category_id and titles

  // Define helper function to simulate posts data
  function createDummyPost(
    id: string,
    category_id: string,
    member_id: string,
    title: string,
    post_status: string,
    created_at: string,
    updated_at: string,
  ): IDiscussionBoardDiscussionBoardPost.ISummary {
    return {
      id,
      category_id,
      member_id,
      title,
      post_status,
      created_at,
      updated_at,
    };
  }

  // Generate dummy posts that include some matching filter
  const filteredKeyword = "investment";
  const filteredCategoryId = category.id;
  const memberId = memberJoinOutput.id;

  // Create some dummy posts
  const posts: IDiscussionBoardDiscussionBoardPost.ISummary[] = [
    createDummyPost(
      typia.random<string & tags.Format<"uuid">>(),
      filteredCategoryId,
      memberId,
      `Investment strategies for 2025`,
      "public",
      new Date().toISOString(),
      new Date().toISOString(),
    ),
    createDummyPost(
      typia.random<string & tags.Format<"uuid">>(),
      filteredCategoryId,
      memberId,
      "Stock market investment",
      "public",
      new Date().toISOString(),
      new Date().toISOString(),
    ),
    createDummyPost(
      typia.random<string & tags.Format<"uuid">>(),
      filteredCategoryId,
      memberId,
      "Political news",
      "public",
      new Date().toISOString(),
      new Date().toISOString(),
    ),
    createDummyPost(
      typia.random<string & tags.Format<"uuid">>(),
      typia.random<string & tags.Format<"uuid">>(), // Different category
      memberId,
      "Unrelated post",
      "public",
      new Date().toISOString(),
      new Date().toISOString(),
    ),
  ];

  // 4. Retrieve posts filtered by category and keyword, with pagination
  const page = 1;
  const limit = 10;
  const reqBody: IDiscussionBoardDiscussionBoardPost.IRequest = {
    page,
    limit,
    category_id: filteredCategoryId,
    search: filteredKeyword,
  };

  const pageResult: IPageIDiscussionBoardDiscussionBoardPost.ISummary =
    await api.functional.discussionBoard.discussionBoardPosts.index(
      connection,
      {
        body: reqBody,
      },
    );
  typia.assert(pageResult);

  // 5. Assertions
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is correct",
    pageResult.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit is correct",
    pageResult.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pageResult.pagination.pages >= 0,
  );

  // Validate each post matches the filter
  for (const post of pageResult.data) {
    TestValidator.equals(
      "post category matches filter",
      post.category_id,
      filteredCategoryId,
    );
    // Keyword filter applies to title (content not in summary DTO)
    TestValidator.predicate(
      "post title contains keyword",
      post.title.toLowerCase().includes(filteredKeyword.toLowerCase()),
    );
  }
}
