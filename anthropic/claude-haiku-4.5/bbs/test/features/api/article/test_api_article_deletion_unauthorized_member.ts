import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test authorization enforcement preventing members from deleting articles
 * authored by other members.
 *
 * This test validates that only the article author or moderators can delete
 * articles. A non-author member attempting to delete another member's article
 * should be denied access with a 403 Forbidden error.
 *
 * The test flow:
 *
 * 1. Create first member account (author)
 * 2. Create article by first member
 * 3. Create second member account (unauthorized)
 * 4. Attempt to delete article as second member
 * 5. Verify deletion fails with permission denied error
 */
export async function test_api_article_deletion_unauthorized_member(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (article author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = "TestPassword123";

  const author: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: authorEmail,
        password: authorPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(author);

  // Step 2: Create article by first member
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
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
        category_code: RandomGenerator.pick(["economics", "politics"] as const),
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Verify article was created by the author
  TestValidator.equals(
    "article author should be the first member",
    article.author.id,
    author.id,
  );

  // Step 3: Create second member account (unauthorized to delete)
  const unauthorizedEmail = typia.random<string & tags.Format<"email">>();
  const unauthorizedPassword = "UnauthorizedPass123";

  const unauthorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: unauthorizedEmail,
        password: unauthorizedPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(unauthorizedMember);

  // Step 4 & 5: Attempt to delete article as unauthorized member
  // This should fail with a 403 Forbidden error
  await TestValidator.error(
    "unauthorized member cannot delete other member's article",
    async () => {
      await api.functional.discussionBoard.moderator.articles.erase(
        connection,
        {
          articleId: article.id,
        },
      );
    },
  );
}
