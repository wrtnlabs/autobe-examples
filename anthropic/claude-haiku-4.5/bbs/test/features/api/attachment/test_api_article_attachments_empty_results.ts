import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";

/**
 * Test search behavior when no attachments match the filter criteria.
 *
 * This test validates that empty result sets are handled correctly by the
 * attachment search API. It verifies:
 *
 * 1. Member authentication and account creation
 * 2. Article creation in a category
 * 3. Attachment search with various filter combinations that produce no results
 * 4. Empty data array is returned with accurate pagination metadata
 * 5. Pagination shows 0 records and 0 pages for empty results
 * 6. No error response despite no matches
 * 7. Operation completes successfully with HTTP 200 status
 */
export async function test_api_article_attachments_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberData = {
    email: memberEmail,
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.name(),
    password: "TestPassword123!",
  } satisfies IDiscussionBoardMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth);
  TestValidator.equals(
    "member authenticated successfully",
    memberAuth.id.length > 0,
    true,
  );

  // Step 2: Create a moderator and category
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderatorData = {
    email: moderatorEmail,
    username: `mod_${RandomGenerator.alphaNumeric(8)}`,
    password: "TestPassword123!",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderatorAuth);

  // Switch to moderator connection for category creation
  const modConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: moderatorAuth.token.access,
    },
  };

  const categoryData = {
    name: `Category_${RandomGenerator.alphaNumeric(6)}`,
    slug: `category-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph(),
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      modConnection,
      { body: categoryData },
    );
  typia.assert(category);

  // Step 3: Switch back to member connection and create an article
  const memberConnection: api.IConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: memberAuth.token.access },
  };

  const articleData = {
    title: `Article_${RandomGenerator.alphaNumeric(6)}`,
    body: RandomGenerator.content({ paragraphs: 3 }),
    category_id: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    { body: articleData },
  );
  typia.assert(article);
  TestValidator.equals(
    "article created successfully",
    article.id.length > 0,
    true,
  );

  // Step 4: Test attachment search with filter that produces no results
  // Search for attachments with a specific filename that doesn't exist
  const searchResult1 =
    await api.functional.discussionBoard.member.articles.attachments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          search: "nonexistent_file_name_xyz.pdf",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(searchResult1);

  // Validate empty result set
  TestValidator.equals(
    "search result has empty data array",
    searchResult1.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0",
    searchResult1.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    searchResult1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page is 0 or 1",
    searchResult1.pagination.current >= 0,
    true,
  );

  // Step 5: Test with file type filter that produces no results
  const searchResult2 =
    await api.functional.discussionBoard.member.articles.attachments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          file_type:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(searchResult2);

  TestValidator.equals(
    "file type filter returns empty data",
    searchResult2.data.length,
    0,
  );
  TestValidator.equals(
    "file type filter pagination is accurate",
    searchResult2.pagination.records,
    0,
  );

  // Step 6: Test with size range filter that produces no results
  const searchResult3 =
    await api.functional.discussionBoard.member.articles.attachments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          min_size: 1000000,
          max_size: 5000000,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(searchResult3);

  TestValidator.equals(
    "size range filter returns empty data",
    searchResult3.data.length,
    0,
  );
  TestValidator.equals(
    "size range filter pagination records is 0",
    searchResult3.pagination.records,
    0,
  );
  TestValidator.equals(
    "size range filter pagination pages is 0",
    searchResult3.pagination.pages,
    0,
  );

  // Step 7: Test with date range filter that produces no results (future dates)
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const futureDateString = futureDate.toISOString().split("T")[0];

  const searchResult4 =
    await api.functional.discussionBoard.member.articles.attachments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          upload_date_from: futureDateString,
          upload_date_to: futureDateString,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(searchResult4);

  TestValidator.equals(
    "date range filter returns empty data",
    searchResult4.data.length,
    0,
  );
  TestValidator.equals(
    "date range filter pagination records is 0",
    searchResult4.pagination.records,
    0,
  );

  // Step 8: Test with combined filters that produce no results
  const searchResult5 =
    await api.functional.discussionBoard.member.articles.attachments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          search: "impossible_filename",
          file_type: "image/png",
          min_size: 999999,
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(searchResult5);

  TestValidator.equals(
    "combined filters return empty data",
    searchResult5.data.length,
    0,
  );
  TestValidator.equals(
    "combined filters pagination is accurate",
    searchResult5.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filters pagination pages is 0",
    searchResult5.pagination.pages,
    0,
  );
}
