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

export async function test_api_article_moderator_archive_published_article(
  connection: api.IConnection,
) {
  // Step 1: Create a contributor account to author an article
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphabets(10),
      password: "TestPass123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor account is active",
    contributor.account_status === "active",
  );

  // Step 2: Create an article in draft status
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const articleCreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    categoryId: categoryId,
    href: "http://localhost:3000/articles/create",
    referrer: "http://localhost:3000",
  } satisfies IDiscussionBoardArticle.ICreate;

  const draftArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: articleCreate,
      },
    );
  typia.assert(draftArticle);
  TestValidator.equals("article status is draft", draftArticle.status, "draft");

  // Step 3: Update article to pending_approval status
  const articleUpdate = {
    status: "pending_approval",
  } satisfies IDiscussionBoardArticle.IUpdate;

  const pendingArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: draftArticle.id,
        body: articleUpdate,
      },
    );
  typia.assert(pendingArticle);
  TestValidator.equals(
    "article status is pending_approval",
    pendingArticle.status,
    "pending_approval",
  );

  // Step 4: Create a moderator account to approve and archive the article
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: "ModPass123!",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account is active",
    moderator.account_status === "active",
  );

  // Step 5: Moderator approves the article (transitions to published)
  const approvalUpdate = {
    status: "published",
    approval_notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardArticle.IUpdate;

  const publishedArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      { articleId: pendingArticle.id, body: approvalUpdate },
    );
  typia.assert(publishedArticle);
  TestValidator.equals(
    "article status is published",
    publishedArticle.status,
    "published",
  );
  TestValidator.predicate(
    "published_at timestamp is set after approval",
    publishedArticle.published_at !== null &&
      publishedArticle.published_at !== undefined,
  );

  // Step 6: Moderator archives the published article
  const archiveUpdate = {
    status: "archived",
  } satisfies IDiscussionBoardArticle.IUpdate;

  const archivedArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      { articleId: publishedArticle.id, body: archiveUpdate },
    );
  typia.assert(archivedArticle);
  TestValidator.equals(
    "article status transitions to archived",
    archivedArticle.status,
    "archived",
  );

  // Step 7: Verify archived article maintains key metadata
  TestValidator.equals(
    "article ID preserved after archival",
    archivedArticle.id,
    publishedArticle.id,
  );
  TestValidator.equals(
    "article title preserved after archival",
    archivedArticle.title,
    publishedArticle.title,
  );
  TestValidator.equals(
    "article content preserved after archival",
    archivedArticle.content,
    publishedArticle.content,
  );
  TestValidator.equals(
    "published_at timestamp preserved after archival",
    archivedArticle.published_at,
    publishedArticle.published_at,
  );

  // Step 8: Verify article author information is maintained
  TestValidator.equals(
    "author ID preserved in archived article",
    archivedArticle.author.id,
    contributor.id,
  );
  TestValidator.equals(
    "author username preserved in archived article",
    archivedArticle.author.username,
    contributor.username,
  );

  // Step 9: Verify article properties after archival
  TestValidator.predicate(
    "archived article maintains creation timestamp",
    archivedArticle.created_at !== null &&
      archivedArticle.created_at !== undefined,
  );
  TestValidator.predicate(
    "archived article has updated_at timestamp",
    archivedArticle.updated_at !== null &&
      archivedArticle.updated_at !== undefined,
  );
}
