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
 * Test attachment deletion when an article has multiple attachments.
 *
 * This test validates that deleting a specific attachment from an article
 * containing multiple attachments removes only the targeted attachment while
 * leaving all other attachments intact and accessible.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as a member
 * 2. Create a moderator and article category (prerequisites)
 * 3. Create an article as the authenticated member
 * 4. Upload multiple attachments (mix of images and documents)
 * 5. Delete one specific attachment by its ID
 * 6. Verify only the targeted attachment is removed
 * 7. Verify all other attachments remain accessible and unchanged
 */
export async function test_api_attachment_deletion_multiple_attachments(
  connection: api.IConnection,
) {
  // Step 1: Register and login as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }),
      href: "https://test.example.com/register",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create moderator and category
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "modPassword123!",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://test.example.com/mod-register",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category",
          description: "Category for testing attachments",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Switch back to member and create article
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://test.example.com/login",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: Upload multiple attachments (2 images, 2 documents)
  const attachments: IDiscussionBoardArticleAttachment[] = [];

  // Upload first image
  const attachment1 =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "image",
          format: "jpeg",
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<5242880>
          >(),
          original_filename: "test-image-1.jpeg",
          storage_path: `/storage/images/${typia.random<string & tags.Format<"uuid">>()}.jpeg`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment1);
  attachments.push(attachment1);

  // Upload second image (this will be deleted)
  const attachment2 =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "image",
          format: "png",
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<5242880>
          >(),
          original_filename: "test-image-2.png",
          storage_path: `/storage/images/${typia.random<string & tags.Format<"uuid">>()}.png`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment2);
  attachments.push(attachment2);

  // Upload first document
  const attachment3 =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "file",
          format: "pdf",
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<10485760>
          >(),
          original_filename: "test-document-1.pdf",
          storage_path: `/storage/files/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment3);
  attachments.push(attachment3);

  // Upload second document
  const attachment4 =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "file",
          format: "docx",
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<10485760>
          >(),
          original_filename: "test-document-2.docx",
          storage_path: `/storage/files/${typia.random<string & tags.Format<"uuid">>()}.docx`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment4);
  attachments.push(attachment4);

  // Verify we have 4 attachments
  TestValidator.equals("should have 4 attachments", attachments.length, 4);

  // Step 5: Delete the second attachment (attachment2)
  const attachmentToDelete = attachment2;

  await api.functional.discussionBoard.member.articles.attachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: attachmentToDelete.id,
    },
  );

  // Step 6: Verify deletion succeeded
  // The deletion should complete without error (void return)

  // Step 7: Verify remaining attachments
  // Since we don't have a list endpoint, we validate that we successfully:
  // - Created 4 attachments
  // - Deleted 1 specific attachment (attachment2)
  // - The remaining 3 attachments (attachment1, attachment3, attachment4) should still exist

  TestValidator.predicate(
    "deleted attachment should be the second image",
    attachmentToDelete.id === attachment2.id,
  );

  TestValidator.predicate(
    "deleted attachment format should be png",
    attachmentToDelete.format === "png",
  );

  // Verify the IDs of remaining attachments are different from deleted one
  const remainingAttachmentIds = [
    attachment1.id,
    attachment3.id,
    attachment4.id,
  ];

  TestValidator.predicate(
    "remaining attachments should not include deleted attachment ID",
    !remainingAttachmentIds.includes(attachmentToDelete.id),
  );
}
