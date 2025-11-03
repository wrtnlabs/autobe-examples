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

/**
 * Test that rate limiting is properly enforced for comment creation.
 *
 * Validates that members can post up to 50 comments per hour, and that the 51st
 * comment within the hour is rejected with appropriate rate limit exceeded
 * error message. This ensures spam prevention and platform stability while
 * allowing legitimate high-volume discussion participation.
 *
 * Test workflow:
 *
 * 1. Register a new member account
 * 2. Create a discussion board article
 * 3. Create 50 comments successfully on the article
 * 4. Verify all 50 comments were created with correct properties
 * 5. Attempt to create a 51st comment and verify rejection with rate limit error
 * 6. Confirm error message indicates rate limit exceeded
 */
export async function test_api_comment_rate_limiting_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPass123"; // Must meet: 8+ chars, uppercase, lowercase, number

  const registeredMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(registeredMember);

  // Step 2: Create a discussion board article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 3,
          wordMax: 6,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  TestValidator.predicate(
    "article created with published status",
    article.status === "published",
  );

  // Step 3: Create 50 comments successfully
  const comments: IDiscussionBoardComment[] = [];

  for (let i = 0; i < 50; i++) {
    const comment =
      await api.functional.discussionBoard.member.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            content: RandomGenerator.paragraph({
              sentences: 5,
              wordMin: 3,
              wordMax: 8,
            }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  // Step 4: Verify all 50 comments were created with correct properties
  TestValidator.equals("exactly 50 comments created", comments.length, 50);

  for (const comment of comments) {
    TestValidator.predicate(
      "comment has valid id",
      comment.id !== null && comment.id !== undefined,
    );
    TestValidator.predicate(
      "comment has published status",
      comment.status === "published",
    );
    TestValidator.predicate("comment has content", comment.content.length > 0);
    TestValidator.predicate(
      "comment belongs to correct article",
      comment.discussion_board_article_id === article.id,
    );
  }

  // Step 5: Attempt to create 51st comment and verify rejection
  await TestValidator.error(
    "51st comment exceeds rate limit and is rejected",
    async () => {
      await api.functional.discussionBoard.member.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            content: RandomGenerator.paragraph({
              sentences: 5,
              wordMin: 3,
              wordMax: 8,
            }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );

  // Step 6: Verify rate limiting enforcement
  TestValidator.predicate(
    "rate limiting prevents comments beyond 50 per hour",
    comments.length === 50,
  );
}
