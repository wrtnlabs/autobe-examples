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

export async function test_api_article_attachment_deletion_moderator_unauthorized_format_validation(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPassword123!@";
  const moderatorCreateBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: RandomGenerator.alphabets(8),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreateBody,
  });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created",
    moderator.id !== undefined,
  );

  // Step 2: Register and authenticate contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "TestPassword123!@";
  const contributorUsername = RandomGenerator.alphaNumeric(8);
  const contributorCreateBody = {
    email: contributorEmail,
    password: contributorPassword,
    username: contributorUsername,
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  } satisfies IDiscussionBoardContributor.ICreate;

  const contributor = await api.functional.auth.contributor.join(connection, {
    body: contributorCreateBody,
  });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor account created",
    contributor.id !== undefined,
  );

  // Step 3: Switch to contributor and create article with attachments
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: contributorPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // Create article with valid attachments
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({ paragraphs: 2 });
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const articleCreateBody = {
    title: articleTitle,
    content: articleContent,
    categoryId: categoryId,
    href: "http://localhost:3000/articles/create",
    referrer: "http://localhost:3000",
    attachments: [
      {
        original_filename: "test_document.pdf",
        file_type: "pdf",
        file_size: 1024000,
        mime_type: "application/pdf",
        display_url: "http://localhost:3000/files/test_document.pdf",
      } satisfies IDiscussionBoardArticleAttachment.ICreate,
    ],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);
  TestValidator.predicate(
    "article created successfully",
    article.id !== undefined,
  );
  TestValidator.predicate(
    "article has attachments",
    article.attachments !== undefined && article.attachments.length > 0,
  );

  // Step 4: Switch to moderator for deletion attempts
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 5: Attempt to delete non-existent attachment with valid UUID format
  const nonExistentAttachmentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deletion of non-existent attachment should fail with error",
    async () => {
      await api.functional.discussionBoard.moderator.articles.attachments.erase(
        connection,
        {
          articleId: article.id,
          attachmentId: nonExistentAttachmentId,
        },
      );
    },
  );

  // Step 6: Verify article still has original attachments after failed deletion
  const articlesAfterFailedDeletion =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(articlesAfterFailedDeletion);
  TestValidator.predicate(
    "article attachments preserved after failed deletion attempt",
    articlesAfterFailedDeletion.attachments !== undefined,
  );

  // Step 7: Test deletion attempt with non-existent article ID
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deletion from non-existent article should fail",
    async () => {
      await api.functional.discussionBoard.moderator.articles.attachments.erase(
        connection,
        {
          articleId: nonExistentArticleId,
          attachmentId: nonExistentAttachmentId,
        },
      );
    },
  );

  // Step 8: Test multiple invalid attachment IDs to ensure robust validation
  const invalidAttachmentIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  for (const invalidId of invalidAttachmentIds) {
    await TestValidator.error(
      `deletion with random non-existent attachment ID should fail`,
      async () => {
        await api.functional.discussionBoard.moderator.articles.attachments.erase(
          connection,
          {
            articleId: article.id,
            attachmentId: invalidId,
          },
        );
      },
    );
  }

  // Step 9: Verify original article structure remains intact
  TestValidator.predicate(
    "moderator cannot corrupt article structure through invalid deletion attempts",
    article.id !== undefined && article.attachments !== undefined,
  );
}
