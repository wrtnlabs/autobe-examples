import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleVersion";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionArticleVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionArticleVersion";

/**
 * Test version history retrieval for newly created articles with no edit
 * history.
 *
 * This test validates proper handling when retrieving version history for
 * articles that have never been edited. Ensures the system correctly returns
 * appropriate pagination data and empty version lists while maintaining proper
 * API response structure.
 *
 * Test workflow:
 *
 * 1. Member registration and authentication
 * 2. Create new article with no edit history
 * 3. Retrieve version history for the article
 * 4. Verify empty version list and proper pagination structure
 */
export async function test_api_economic_article_version_history_empty(
  connection: api.IConnection,
) {
  // Step 1: Register new member for testing
  const memberData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: String(RandomGenerator.alphaNumeric(12)),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create new article with no edit history
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 8, wordMin: 4, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 5,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    category_ids: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Retrieve version history for the new article
  const versionRequest = {
    page: 0,
    limit: 10,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IEconomicDiscussionArticleVersion.IRequest;

  const versionHistory =
    await api.functional.economicDiscussion.member.articles.versions.index(
      connection,
      {
        articleId: article.id,
        body: versionRequest,
      },
    );
  typia.assert(versionHistory);

  // Step 4: Verify empty version list and pagination structure
  TestValidator.equals(
    "version history data array should be empty",
    versionHistory.data,
    [],
  );

  // Verify pagination structure is properly formatted
  TestValidator.predicate(
    "pagination object should exist",
    versionHistory.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current should be string",
    typeof versionHistory.pagination.current === "string",
  );
  TestValidator.predicate(
    "pagination pages should be string",
    typeof versionHistory.pagination.pages === "string",
  );
  TestValidator.predicate(
    "pagination limit should be string",
    typeof versionHistory.pagination.limit === "string",
  );
  TestValidator.predicate(
    "pagination records should be string",
    typeof versionHistory.pagination.records === "string",
  );

  // Verify pagination values match expected empty state
  TestValidator.equals(
    "current page should be 0",
    versionHistory.pagination.current,
    "0",
  );
  TestValidator.equals(
    "total pages should be 0",
    versionHistory.pagination.pages,
    "0",
  );
  TestValidator.equals(
    "limit should match request",
    versionHistory.pagination.limit,
    "10",
  );
  TestValidator.equals(
    "total records should be 0",
    versionHistory.pagination.records,
    "0",
  );
}
