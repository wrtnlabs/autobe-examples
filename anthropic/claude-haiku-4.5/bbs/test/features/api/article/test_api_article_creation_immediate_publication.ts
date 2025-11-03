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

export async function test_api_article_creation_immediate_publication(
  connection: api.IConnection,
) {
  // 1. Register a member to create authenticated user account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // 2. Create an article with required fields
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 5,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 3,
    wordMax: 7,
  });
  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(createdArticle);

  // 3. Verify article status is 'published' immediately
  TestValidator.equals(
    "article status should be 'published' immediately after creation",
    createdArticle.status,
    "published",
  );

  // 4. Verify created_at timestamp is current (within reasonable margin)
  const createdAtTime = new Date(createdArticle.created_at).getTime();
  const currentTime = new Date().getTime();
  const timeMarginMs = 10000; // Allow 10 seconds margin
  TestValidator.predicate(
    "created_at timestamp should be within reasonable margin of current time",
    Math.abs(currentTime - createdAtTime) <= timeMarginMs,
  );

  // 5. Verify article content and metadata
  TestValidator.equals(
    "article title should match input",
    createdArticle.title,
    articleTitle,
  );

  TestValidator.equals(
    "article content should match input",
    createdArticle.content,
    articleContent,
  );

  TestValidator.equals(
    "article category code should be 'economics'",
    createdArticle.category.code,
    "economics",
  );

  // 6. Verify article author is the authenticated member
  TestValidator.equals(
    "article author ID should match authenticated member ID",
    createdArticle.author.id,
    member.id,
  );

  // 7. Verify article has initialized metadata
  TestValidator.equals(
    "article view count should start at 0",
    createdArticle.view_count,
    0,
  );

  TestValidator.equals(
    "article revision number should start at 0",
    createdArticle.revision_number,
    0,
  );

  TestValidator.predicate(
    "article should have empty comments array",
    Array.isArray(createdArticle.comments) &&
      createdArticle.comments.length === 0,
  );

  TestValidator.equals(
    "article deleted_at should be null",
    createdArticle.deleted_at,
    null,
  );
}
