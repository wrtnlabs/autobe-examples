import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test contributor article draft to pending_approval submission workflow.
 *
 * This test validates that a contributor can successfully transition an article
 * from draft status to pending_approval status for moderator review. The
 * workflow includes:
 *
 * 1. Create contributor account with valid credentials
 * 2. Create an article draft with complete title and content
 * 3. Update the draft article to pending_approval status
 * 4. Verify status transition and article state
 *
 * This ensures contributors can save draft articles and submit them for
 * moderation review when content is ready.
 */
export async function test_api_article_contributor_update_draft_to_pending_approval(
  connection: api.IConnection,
) {
  // Step 1: Create contributor account for article submission
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "SecurePass123!@#";

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(8),
        password: contributorPassword,
        href: "https://example.com/articles/create",
        referrer: "https://example.com/dashboard",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor account created successfully",
    contributor.id !== null && contributor.email === contributorEmail,
  );

  // Step 2: Create an article in draft status
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
  });

  const draftArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          categoryId: categoryId,
          href: "https://example.com/articles/create",
          referrer: "https://example.com/dashboard",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(draftArticle);
  TestValidator.equals(
    "initial article status is draft",
    draftArticle.status,
    "draft",
  );
  TestValidator.equals(
    "article title matches input",
    draftArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content matches input",
    draftArticle.content,
    articleContent,
  );

  // Step 3: Update article status from draft to pending_approval
  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: draftArticle.id,
        body: {
          status: "pending_approval",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);

  // Step 4: Verify status transition to pending_approval
  TestValidator.equals(
    "article status changed to pending_approval",
    updatedArticle.status,
    "pending_approval",
  );
  TestValidator.equals(
    "article ID preserved after update",
    updatedArticle.id,
    draftArticle.id,
  );
  TestValidator.equals(
    "article title preserved after status update",
    updatedArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content preserved after status update",
    updatedArticle.content,
    articleContent,
  );
  TestValidator.predicate(
    "article author matches contributor",
    updatedArticle.author.id === contributor.id,
  );
  TestValidator.predicate(
    "article updated timestamp is set",
    updatedArticle.updated_at !== null,
  );
}
