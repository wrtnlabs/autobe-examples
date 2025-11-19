import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test public retrieval of an attachment from a published article without
 * requiring authentication.
 *
 * This test validates that attachments are publicly accessible when their
 * parent article is published, supporting the discussion board's open access
 * model for economic and political discussions.
 *
 * Test workflow:
 *
 * 1. Create moderator account for privileged operations
 * 2. Create article category for taxonomy
 * 3. Create member account for article authorship
 * 4. Create and publish article with status='published'
 * 5. Upload image attachment as moderator to the article
 * 6. Retrieve the attachment details without authentication (as public guest)
 *
 * Validation points:
 *
 * - Attachment can be retrieved without authentication tokens
 * - Response contains complete attachment metadata (id, article_id, type, format,
 *   size, filename, storage_path, timestamps)
 * - Business rules verified: public viewability, proper file metadata, storage
 *   path accessibility, referential integrity
 */
export async function test_api_article_attachment_public_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for privileged operations
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecureMod123!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category for taxonomy
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discussions about economic policies and trends",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for article authorship
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecureMem123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create and publish article with status='published'
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 15,
          sentenceMax: 25,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Switch to moderator context and upload image attachment
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: "https://example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const imageFormat = RandomGenerator.pick([
    "jpeg",
    "png",
    "gif",
    "webp",
  ] as const);
  const imageSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5242880>
  >() satisfies number as number;
  const originalFilename = `discussion-image-${RandomGenerator.alphaNumeric(8)}.${imageFormat}`;
  const storagePath = `/storage/articles/${article.id}/images/${typia.random<string & tags.Format<"uuid">>()}.${imageFormat}`;

  const attachment =
    await api.functional.discussionBoard.moderator.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "image",
          format: imageFormat,
          size: imageSize,
          original_filename: originalFilename,
          storage_path: storagePath,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Step 6: Create unauthenticated connection and retrieve attachment as public guest
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const retrievedAttachment =
    await api.functional.discussionBoard.articles.attachments.at(
      unauthenticatedConnection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(retrievedAttachment);

  // Validate attachment metadata
  TestValidator.equals(
    "attachment ID matches",
    retrievedAttachment.id,
    attachment.id,
  );
  TestValidator.equals(
    "attachment belongs to article",
    retrievedAttachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "attachment type is image",
    retrievedAttachment.type,
    "image",
  );
  TestValidator.equals(
    "attachment format matches",
    retrievedAttachment.format,
    imageFormat,
  );
  TestValidator.equals(
    "attachment size matches",
    retrievedAttachment.size,
    imageSize,
  );
  TestValidator.equals(
    "attachment filename matches",
    retrievedAttachment.original_filename,
    originalFilename,
  );
  TestValidator.equals(
    "attachment storage path matches",
    retrievedAttachment.storage_path,
    storagePath,
  );
  TestValidator.predicate(
    "attachment has valid created_at timestamp",
    typeof retrievedAttachment.created_at === "string" &&
      retrievedAttachment.created_at.length > 0,
  );
  TestValidator.predicate(
    "attachment has valid updated_at timestamp",
    typeof retrievedAttachment.updated_at === "string" &&
      retrievedAttachment.updated_at.length > 0,
  );
  TestValidator.predicate(
    "attachment is not deleted",
    retrievedAttachment.deleted_at === null ||
      retrievedAttachment.deleted_at === undefined,
  );
}
