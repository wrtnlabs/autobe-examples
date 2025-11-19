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
 * Test attachment deletion by article author workflow.
 *
 * This test validates that a member can successfully delete attachments from
 * their own article. It follows the complete workflow: member registration,
 * category creation (via moderator), article creation, attachment upload, and
 * finally attachment deletion.
 *
 * Steps:
 *
 * 1. Create and authenticate as a member
 * 2. Create and authenticate as a moderator
 * 3. Moderator creates an article category
 * 4. Switch back to member context
 * 5. Member creates an article
 * 6. Member uploads image and document attachments
 * 7. Member deletes one attachment
 * 8. Verify the article remains intact after deletion
 */
export async function test_api_attachment_deletion_by_article_author(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "memberPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }),
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create and authenticate as a moderator to create category
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderatorPassword123";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Moderator creates a category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category " + RandomGenerator.alphaNumeric(6),
          slug: "test-category-" + RandomGenerator.alphaNumeric(6),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to member context
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Step 5: Member creates an article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 6: Upload image attachment
  const imageAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "image",
          format: RandomGenerator.pick(["jpeg", "png", "gif", "webp"] as const),
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<0> &
              tags.Maximum<5242880>
          >(),
          original_filename: `test-image-${RandomGenerator.alphaNumeric(8)}.jpg`,
          storage_path: `/storage/images/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(imageAttachment);

  // Step 7: Upload document attachment
  const documentAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "file",
          format: RandomGenerator.pick(["pdf", "doc", "docx", "txt"] as const),
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<0> &
              tags.Maximum<10485760>
          >(),
          original_filename: `test-document-${RandomGenerator.alphaNumeric(8)}.pdf`,
          storage_path: `/storage/files/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(documentAttachment);

  // Step 8: Delete the image attachment
  await api.functional.discussionBoard.member.articles.attachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: imageAttachment.id,
    },
  );

  // Step 9: Verify the article remains intact after attachment deletion
  // Note: Since there's no get endpoint for articles in the provided API,
  // we verify deletion succeeded by testing that attempting to delete
  // the same attachment again produces an error (attachment no longer exists)
  await TestValidator.error(
    "deleting already deleted attachment should fail",
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.erase(
        connection,
        {
          articleId: article.id,
          attachmentId: imageAttachment.id,
        },
      );
    },
  );
}
