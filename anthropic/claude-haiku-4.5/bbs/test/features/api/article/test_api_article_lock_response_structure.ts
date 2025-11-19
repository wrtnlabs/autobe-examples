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

export async function test_api_article_lock_response_structure(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      password: "ContPass@123",
      username: RandomGenerator.alphaNumeric(8),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Create article as contributor (join already authenticated)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: categoryId,
          href: "https://example.com/article/create",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "ModPass@123",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies IDiscussionBoardModerator.ICreate,
  });

  // Step 4: Authenticate as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModPass@123",
      href: "https://example.com/mod-login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 5: Lock the article
  const lockedArticle =
    await api.functional.discussionBoard.moderator.articles.lock(connection, {
      articleId: article.id,
    });
  typia.assert(lockedArticle);

  // Step 6: Validate response structure - verify all required fields are present
  TestValidator.equals(
    "locked article id matches created article",
    lockedArticle.id,
    article.id,
  );

  TestValidator.predicate(
    "locked article has non-empty title",
    lockedArticle.title.length > 0,
  );

  TestValidator.predicate(
    "locked article has non-empty content",
    lockedArticle.content.length > 0,
  );

  TestValidator.predicate(
    "locked article has valid status",
    [
      "draft",
      "pending_approval",
      "published",
      "rejected",
      "archived",
      "deleted",
    ].includes(lockedArticle.status),
  );

  TestValidator.predicate(
    "locked article author has id and username",
    lockedArticle.author.id !== undefined &&
      lockedArticle.author.username !== undefined,
  );

  TestValidator.predicate(
    "locked article category has id, code, and name",
    lockedArticle.category.id !== undefined &&
      lockedArticle.category.code !== undefined &&
      lockedArticle.category.name !== undefined,
  );

  TestValidator.predicate(
    "locked article has valid created_at timestamp",
    lockedArticle.created_at !== undefined &&
      lockedArticle.created_at.length > 0,
  );

  TestValidator.predicate(
    "locked article has valid updated_at timestamp",
    lockedArticle.updated_at !== undefined &&
      lockedArticle.updated_at.length > 0,
  );

  TestValidator.predicate(
    "locked article view_count is non-negative integer",
    typeof lockedArticle.view_count === "number" &&
      lockedArticle.view_count >= 0 &&
      Number.isInteger(lockedArticle.view_count),
  );

  TestValidator.predicate(
    "locked article comment_count is non-negative integer",
    typeof lockedArticle.comment_count === "number" &&
      lockedArticle.comment_count >= 0 &&
      Number.isInteger(lockedArticle.comment_count),
  );

  TestValidator.predicate(
    "locked article is_pinned is boolean",
    typeof lockedArticle.is_pinned === "boolean",
  );

  TestValidator.equals(
    "locked article is_locked should be true after lock operation",
    lockedArticle.is_locked,
    true,
  );

  TestValidator.predicate(
    "locked article attachments is array",
    Array.isArray(lockedArticle.attachments),
  );

  TestValidator.predicate(
    "lock response contains complete article structure with all required fields",
    lockedArticle.id !== undefined &&
      lockedArticle.title !== undefined &&
      lockedArticle.content !== undefined &&
      lockedArticle.status !== undefined &&
      lockedArticle.author !== undefined &&
      lockedArticle.category !== undefined &&
      lockedArticle.created_at !== undefined &&
      lockedArticle.updated_at !== undefined &&
      typeof lockedArticle.view_count === "number" &&
      typeof lockedArticle.comment_count === "number" &&
      typeof lockedArticle.is_pinned === "boolean" &&
      lockedArticle.is_locked === true &&
      Array.isArray(lockedArticle.attachments),
  );
}
