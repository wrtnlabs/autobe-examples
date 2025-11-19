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

export async function test_api_article_attachment_deletion_with_multiple_attachments(
  connection: api.IConnection,
) {
  // Step 1: Contributor authentication
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: "TestPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Use a valid category ID
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
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
            wordMin: 3,
            wordMax: 7,
          }),
          categoryId: categoryId,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate(
    "article created successfully",
    article.attachments === undefined || article.attachments.length === 0,
  );

  // Step 4: Create three attachments with different file types
  const attachment1: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.contributor.articles.attachments.attach(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: "image1.jpg",
          file_type: "jpg",
          file_size: 204800,
          mime_type: "image/jpeg",
          display_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment1);

  const attachment2: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.contributor.articles.attachments.attach(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: "document.pdf",
          file_type: "pdf",
          file_size: 1048576,
          mime_type: "application/pdf",
          display_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment2);

  const attachment3: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.contributor.articles.attachments.attach(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: "image2.png",
          file_type: "png",
          file_size: 307200,
          mime_type: "image/png",
          display_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment3);

  // Step 5: Delete the second attachment
  await api.functional.discussionBoard.contributor.articles.attachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: attachment2.id,
    },
  );

  // Step 6: Verify remaining attachment1 metadata is intact
  TestValidator.equals(
    "attachment1 filename preserved after deletion",
    attachment1.original_filename,
    "image1.jpg",
  );
  TestValidator.equals(
    "attachment1 file_type preserved after deletion",
    attachment1.file_type,
    "jpg",
  );
  TestValidator.equals(
    "attachment1 file_size preserved after deletion",
    attachment1.file_size,
    204800,
  );
  TestValidator.equals(
    "attachment1 mime_type preserved after deletion",
    attachment1.mime_type,
    "image/jpeg",
  );
  TestValidator.predicate(
    "attachment1 display_url is valid and accessible",
    attachment1.display_url.length > 0 &&
      attachment1.display_url.includes("://"),
  );

  // Step 7: Verify remaining attachment3 metadata is intact
  TestValidator.equals(
    "attachment3 filename preserved after deletion",
    attachment3.original_filename,
    "image2.png",
  );
  TestValidator.equals(
    "attachment3 file_type preserved after deletion",
    attachment3.file_type,
    "png",
  );
  TestValidator.equals(
    "attachment3 file_size preserved after deletion",
    attachment3.file_size,
    307200,
  );
  TestValidator.equals(
    "attachment3 mime_type preserved after deletion",
    attachment3.mime_type,
    "image/png",
  );
  TestValidator.predicate(
    "attachment3 display_url is valid and accessible",
    attachment3.display_url.length > 0 &&
      attachment3.display_url.includes("://"),
  );

  // Step 8: Verify deleted attachment2 is different from remaining attachments
  TestValidator.notEquals(
    "deleted attachment2 id differs from attachment1",
    attachment2.id,
    attachment1.id,
  );
  TestValidator.notEquals(
    "deleted attachment2 id differs from attachment3",
    attachment2.id,
    attachment3.id,
  );

  // Step 9: Verify article properties remain unchanged
  TestValidator.predicate(
    "article id remains consistent",
    article.id.length > 0,
  );
  TestValidator.predicate(
    "article title remains non-empty",
    article.title.length > 0,
  );
  TestValidator.predicate(
    "article content remains non-empty",
    article.content.length > 0,
  );
}
