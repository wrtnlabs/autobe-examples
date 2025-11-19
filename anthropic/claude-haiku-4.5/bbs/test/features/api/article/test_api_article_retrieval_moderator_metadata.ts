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
 * Validate moderator metadata fields are properly exposed in article retrieval
 * responses.
 *
 * This test ensures that articles retrieved through the API properly include
 * all moderation-related fields in their response structure, including
 * is_pinned and is_locked boolean flags, moderator approval information via
 * approvedByModerator, editorial change tracking via lastEditedByContributor,
 * and complete audit trail timestamps. The test verifies field presence, type
 * correctness, and temporal consistency of audit timestamps.
 *
 * Test workflow:
 *
 * 1. Create a contributor account for article authorship
 * 2. Create an article in draft status
 * 3. Retrieve the created article
 * 4. Validate all moderator metadata fields are present with correct types
 * 5. Verify is_pinned and is_locked are boolean flags
 * 6. Validate approvedByModerator has correct structure when present
 * 7. Verify lastEditedByContributor has correct structure when present
 * 8. Confirm audit trail timestamps are properly formatted and temporally
 *    consistent
 */
export async function test_api_article_retrieval_moderator_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create a contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>({
          locale: "en-US",
        } as any),
        username: `user_${RandomGenerator.alphaNumeric(12)}`,
        password: "SecurePassword123!",
        href: "https://example.com/articles",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor account is active",
    contributor.account_status,
    "active",
  );

  // Step 2: Create an article in draft status
  const articleData = {
    title: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 4,
      sentenceMax: 8,
      wordMin: 2,
      wordMax: 7,
    }),
    categoryId: typia.random<string & tags.Format<"uuid">>({
      locale: "en-US",
    } as any),
    href: "https://example.com/articles/create",
    referrer: "https://example.com/articles",
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      { body: articleData },
    );
  typia.assert(createdArticle);
  TestValidator.equals(
    "article created in draft status",
    createdArticle.status,
    "draft",
  );
  TestValidator.equals(
    "article author is the creating contributor",
    createdArticle.author.id,
    contributor.id,
  );

  // Step 3: Retrieve the created article
  const retrievedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: createdArticle.id,
    });
  typia.assert(retrievedArticle);
  TestValidator.equals(
    "retrieved article ID matches created article",
    retrievedArticle.id,
    createdArticle.id,
  );

  // Step 4: Validate all moderator metadata fields are present with correct types
  TestValidator.predicate(
    "is_pinned field exists and is boolean",
    typeof retrievedArticle.is_pinned === "boolean",
  );
  TestValidator.predicate(
    "is_locked field exists and is boolean",
    typeof retrievedArticle.is_locked === "boolean",
  );

  // Step 5: Verify is_pinned and is_locked are boolean flags
  TestValidator.predicate(
    "is_pinned is valid boolean value",
    retrievedArticle.is_pinned === true || retrievedArticle.is_pinned === false,
  );
  TestValidator.predicate(
    "is_locked is valid boolean value",
    retrievedArticle.is_locked === true || retrievedArticle.is_locked === false,
  );

  // Step 6: Validate approvedByModerator has correct structure when present
  if (
    retrievedArticle.approvedByModerator !== null &&
    retrievedArticle.approvedByModerator !== undefined
  ) {
    TestValidator.predicate(
      "approvedByModerator has id field",
      typeof retrievedArticle.approvedByModerator.id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          retrievedArticle.approvedByModerator.id,
        ),
    );
    TestValidator.predicate(
      "approvedByModerator has username field",
      typeof retrievedArticle.approvedByModerator.username === "string" &&
        retrievedArticle.approvedByModerator.username.length > 0,
    );
  }

  // Step 7: Verify lastEditedByContributor has correct structure when present
  if (
    retrievedArticle.lastEditedByContributor !== null &&
    retrievedArticle.lastEditedByContributor !== undefined
  ) {
    TestValidator.predicate(
      "lastEditedByContributor has id field",
      typeof retrievedArticle.lastEditedByContributor.id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          retrievedArticle.lastEditedByContributor.id,
        ),
    );
    TestValidator.predicate(
      "lastEditedByContributor has username field",
      typeof retrievedArticle.lastEditedByContributor.username === "string" &&
        retrievedArticle.lastEditedByContributor.username.length > 0,
    );
  }

  // Step 8: Confirm audit trail timestamps are properly formatted and temporally consistent
  TestValidator.predicate(
    "created_at is valid ISO 8601 date-time",
    typeof retrievedArticle.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedArticle.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 date-time",
    typeof retrievedArticle.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedArticle.updated_at),
  );
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    new Date(retrievedArticle.created_at).getTime() <=
      new Date(retrievedArticle.updated_at).getTime(),
  );

  // Step 9: Verify published_at timestamp when article is published
  if (
    retrievedArticle.published_at !== null &&
    retrievedArticle.published_at !== undefined
  ) {
    TestValidator.predicate(
      "published_at is valid ISO 8601 date-time",
      typeof retrievedArticle.published_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
          retrievedArticle.published_at,
        ),
    );
    TestValidator.predicate(
      "published_at is after or equal to created_at",
      new Date(retrievedArticle.created_at).getTime() <=
        new Date(retrievedArticle.published_at).getTime(),
    );
  }
}
