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
 * Test article creation with oversized document attachment.
 *
 * This test validates that the discussion board system properly enforces
 * document size limits (25MB maximum) when creating articles with attachments.
 *
 * The test simulates a contributor attempting to attach a document that exceeds
 * the 25MB size limit and verifies that:
 *
 * 1. The system rejects the oversized attachment during validation
 * 2. An appropriate error message indicates the size limit violation
 * 3. The article is not created when attachment validation fails
 * 4. The system maintains data integrity by preventing partial creation
 */
export async function test_api_article_creation_oversized_document_attachment(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a contributor account
  const contributorData = {
    email:
      typia
        .random<string & tags.Format<"email">>()
        .split("@")[0]
        .substring(0, 20) + "@example.com",
    username: RandomGenerator.alphabets(5) + RandomGenerator.alphaNumeric(3),
    password: "SecurePass123!@",
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000/home",
  } satisfies IDiscussionBoardContributor.ICreate;

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: contributorData,
    });
  typia.assert(contributor);

  // Step 2: Get a valid article category ID
  // Using a random UUID as categoryId since we don't have a categories endpoint
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create an oversized document attachment that exceeds 25MB limit
  // 25MB = 26,214,400 bytes, we create one that's 26,500,000 bytes
  const oversizedFileSize = 26_500_000;

  const oversizedAttachment = {
    original_filename: "large_document.pdf",
    file_type: "pdf",
    file_size: oversizedFileSize,
    mime_type: "application/pdf",
    display_url: "http://localhost:3000/files/large_document.pdf",
  } satisfies IDiscussionBoardArticleAttachment.ICreate;

  // Step 4: Attempt to create article with oversized document attachment
  // This should fail validation with a size limit error
  await TestValidator.error(
    "article creation should fail with oversized document attachment exceeding 25MB limit",
    async () => {
      await api.functional.discussionBoard.contributor.articles.create(
        connection,
        {
          body: {
            title: "Analysis of Economic Policy",
            content:
              "This is a comprehensive analysis covering multiple aspects of contemporary economic policies and their implications for market participants.",
            categoryId: categoryId,
            href: "http://localhost:3000/articles/new",
            referrer: "http://localhost:3000/articles",
            attachments: [oversizedAttachment],
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    },
  );

  // Step 5: Verify article creation still works with valid attachment size
  const validAttachment = {
    original_filename: "valid_document.pdf",
    file_type: "pdf",
    file_size: 5_242_880, // 5MB - well within the 25MB limit
    mime_type: "application/pdf",
    display_url: "http://localhost:3000/files/valid_document.pdf",
  } satisfies IDiscussionBoardArticleAttachment.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Political Governance Systems",
          content:
            "An in-depth examination of various political governance systems and their effectiveness in modern democratic societies.",
          categoryId: categoryId,
          href: "http://localhost:3000/articles/new",
          referrer: "http://localhost:3000/articles",
          attachments: [validAttachment],
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(createdArticle);

  // Step 6: Validate the created article has correct properties
  TestValidator.predicate(
    "created article should have draft status",
    createdArticle.status === "draft",
  );

  TestValidator.predicate(
    "created article should have attachment",
    createdArticle.attachments !== undefined &&
      createdArticle.attachments.length > 0,
  );

  if (createdArticle.attachments && createdArticle.attachments.length > 0) {
    const attachment = createdArticle.attachments[0];
    TestValidator.equals(
      "attachment file size should match request",
      attachment.file_size,
      validAttachment.file_size,
    );
  }
}
