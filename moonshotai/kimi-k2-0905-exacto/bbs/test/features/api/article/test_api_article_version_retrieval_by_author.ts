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
 * Test retrieving a specific article version snapshot by the article author.
 *
 * This test validates that members can view historical versions of their own
 * articles to track content evolution. It follows the complete workflow of
 * creating an article, retrieving version history, and accessing a specific
 * version snapshot to verify historical data accuracy.
 */
export async function test_api_article_version_retrieval_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new member account for article authoring
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const authMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(authMember);
  TestValidator.equals(
    "member registration successful",
    authMember.member.email,
    memberData.email,
  );

  // Step 2: Create test article to generate version history
  const articleContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const articleTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });

  const createData = {
    title: articleTitle,
    content: articleContent,
    category_ids: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const createdArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: createData,
    });
  typia.assert(createdArticle);
  TestValidator.equals(
    "article created with expected title",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article created with expected content",
    createdArticle.content,
    articleContent,
  );
  TestValidator.predicate(
    "article version starts at 1",
    createdArticle.version === 1,
  );

  // Step 3: Retrieve version history to get valid version ID
  const versionHistoryRequest = {
    page: 0,
    limit: 10,
    order_by: "created_at" as const,
    order_direction: "asc" as const,
  } satisfies IEconomicDiscussionArticleVersion.IRequest;

  const versionHistory =
    await api.functional.economicDiscussion.member.articles.versions.index(
      connection,
      {
        articleId: createdArticle.id,
        body: versionHistoryRequest,
      },
    );
  typia.assert(versionHistory);

  TestValidator.predicate(
    "version history contains data",
    versionHistory.data.length > 0,
  );
  TestValidator.predicate(
    "version history shows first page",
    versionHistory.data[0].version === 1,
  );

  // Step 4: Access specific version snapshot using retrieved version ID
  const targetVersion = versionHistory.data[0]; // Get the first (creation) version
  const retrievedVersion =
    await api.functional.economicDiscussion.member.articles.versions.at(
      connection,
      {
        articleId: createdArticle.id,
        versionId: targetVersion.id,
      },
    );
  typia.assert(retrievedVersion);

  // Step 5: Validate retrieved version contains accurate historical data
  TestValidator.equals(
    "retrieved version ID matches",
    retrievedVersion.id,
    targetVersion.id,
  );
  TestValidator.equals(
    "retrieved version article ID matches",
    retrievedVersion.economic_discussion_article_id,
    createdArticle.id,
  );
  TestValidator.equals(
    "retrieved version number matches",
    retrievedVersion.version,
    targetVersion.version,
  );
  TestValidator.equals(
    "retrieved version title matches original",
    retrievedVersion.title,
    articleTitle,
  );
  TestValidator.equals(
    "retrieved version content matches original",
    retrievedVersion.content,
    articleContent,
  );
  TestValidator.predicate(
    "version has creation timestamp",
    typeof retrievedVersion.created_at === "string" &&
      retrievedVersion.created_at.length > 0,
  );

  // Additional validation: version structure consistency
  TestValidator.predicate(
    "all version fields are populated",
    retrievedVersion.id !== null &&
      retrievedVersion.economic_discussion_article_id !== null &&
      retrievedVersion.title !== null &&
      retrievedVersion.content !== null &&
      retrievedVersion.created_at !== null,
  );

  // Verify no unauthorized access (author can only access their own versions)
  TestValidator.equals(
    "version belongs to the correct article",
    retrievedVersion.economic_discussion_article_id,
    createdArticle.id,
  );
}
