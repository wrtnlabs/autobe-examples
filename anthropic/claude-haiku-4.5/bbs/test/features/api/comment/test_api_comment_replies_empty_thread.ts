import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test reply retrieval when a parent comment has no replies.
 *
 * This test validates the system's ability to gracefully handle comments with
 * no child comments. The endpoint should return an empty paginated results
 * array with total count of zero, demonstrating proper empty state handling for
 * threaded discussions. This ensures the API correctly processes requests for
 * comments that have never received any replies and returns appropriate empty
 * result structures.
 *
 * Test workflow:
 *
 * 1. Register a new member to create content
 * 2. Create an article for discussion
 * 3. Create a parent comment with no replies on the article
 * 4. Query replies for the parent comment using the PATCH endpoint
 * 5. Validate that the response contains empty results with correct pagination
 * 6. Verify total count is zero and no data items are present
 * 7. Confirm the pagination structure is valid for empty results
 */
export async function test_api_comment_replies_empty_thread(
  connection: api.IConnection,
) {
  // Step 1: Register a new member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member);

  // Step 2: Create an article for discussion
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 2,
          wordMax: 5,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Create a parent comment with no replies
  const parentComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parentComment);

  // Step 4: Query replies for the parent comment using PATCH endpoint
  const repliesResponse =
    await api.functional.discussionBoard.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(repliesResponse);

  // Step 5: Validate that the response contains empty results with correct pagination
  TestValidator.equals(
    "replies should be empty array",
    repliesResponse.data,
    [],
  );

  // Step 6: Verify total count is zero
  TestValidator.equals(
    "total records should be zero",
    repliesResponse.pagination.records,
    0,
  );

  // Step 7: Confirm the pagination structure is valid for empty results
  TestValidator.equals(
    "current page should be 1",
    repliesResponse.pagination.current,
    1,
  );

  TestValidator.equals(
    "limit should be 20",
    repliesResponse.pagination.limit,
    20,
  );

  TestValidator.equals(
    "total pages should be 0",
    repliesResponse.pagination.pages,
    0,
  );
}
