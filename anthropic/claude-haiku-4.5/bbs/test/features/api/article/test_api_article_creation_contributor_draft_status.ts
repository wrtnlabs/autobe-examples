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

export async function test_api_article_creation_contributor_draft_status(
  connection: api.IConnection,
) {
  // Step 1: Contributor registers and authenticates with join endpoint
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphaNumeric(20),
        password: "SecurePass123!",
        ip: "192.168.1.1",
        href: "https://example.com/registration",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor authenticated successfully",
    contributor.account_status === "active",
  );
  TestValidator.equals(
    "contributor email matches input",
    contributor.email,
    contributorEmail,
  );

  // Step 2: Create article in draft status with valid article data
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const articleTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
  });

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          categoryId: categoryId,
          ip: "192.168.1.1",
          href: "https://example.com/articles/new",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(createdArticle);

  // Step 3: Verify response contains required fields and draft status
  TestValidator.predicate(
    "article id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      createdArticle.id,
    ),
  );
  TestValidator.equals(
    "article status is draft",
    createdArticle.status,
    "draft",
  );
  TestValidator.equals(
    "article title matches input",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content matches input",
    createdArticle.content,
    articleContent,
  );
  TestValidator.equals(
    "article author is contributor",
    createdArticle.author.id,
    contributor.id,
  );
  TestValidator.equals(
    "article author username matches",
    createdArticle.author.username,
    contributor.username,
  );
  TestValidator.predicate(
    "article created_at timestamp exists",
    createdArticle.created_at !== null &&
      createdArticle.created_at !== undefined,
  );
  TestValidator.predicate(
    "article updated_at timestamp exists",
    createdArticle.updated_at !== null &&
      createdArticle.updated_at !== undefined,
  );

  // Step 4: Verify draft status properties
  TestValidator.predicate(
    "draft article not approved by moderator",
    createdArticle.approvedByModerator === null ||
      createdArticle.approvedByModerator === undefined,
  );
  TestValidator.predicate(
    "draft article not yet published",
    createdArticle.published_at === null ||
      createdArticle.published_at === undefined,
  );
  TestValidator.predicate(
    "draft article not deleted",
    createdArticle.deleted_at === null ||
      createdArticle.deleted_at === undefined,
  );
  TestValidator.predicate(
    "draft article has zero views",
    createdArticle.view_count === 0,
  );
  TestValidator.predicate(
    "draft article has zero comments",
    createdArticle.comment_count === 0,
  );
  TestValidator.predicate(
    "draft article is not pinned",
    createdArticle.is_pinned === false,
  );
  TestValidator.predicate(
    "draft article is not locked",
    createdArticle.is_locked === false,
  );
}
