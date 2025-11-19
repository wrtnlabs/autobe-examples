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
 * Test that attachment size limits are properly enforced according to business
 * rules.
 *
 * This test validates the attachment size limit enforcement:
 *
 * - Images: 5MB maximum (5,242,880 bytes)
 * - Documents: 10MB maximum (10,485,760 bytes)
 *
 * Test workflow:
 *
 * 1. Create moderator and category setup
 * 2. Create member and article
 * 3. Attempt to upload oversized image (5MB + 1 byte) - expect rejection
 * 4. Upload image at exact limit (5MB) - expect success
 * 5. Attempt to upload oversized document (10MB + 1 byte) - expect rejection
 * 6. Upload document at exact limit (10MB) - expect success
 */
export async function test_api_article_attachment_size_limit_validation(
  connection: api.IConnection,
) {
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: "https://example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category",
          description: "Category for testing attachment size limits",
          sort_order: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: "127.0.0.1",
      href: "https://example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
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

  await TestValidator.error(
    "image attachment exceeding 5MB limit should fail",
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            type: "image",
            format: "jpeg",
            size: 5242881 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
            original_filename: "oversized_image.jpeg",
            storage_path: "/storage/attachments/oversized_image.jpeg",
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        },
      );
    },
  );

  const validImageAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "image",
          format: "png",
          size: 5242880 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
          original_filename: "valid_image.png",
          storage_path: "/storage/attachments/valid_image.png",
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(validImageAttachment);

  await TestValidator.error(
    "document attachment exceeding 10MB limit should fail",
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            type: "file",
            format: "pdf",
            size: 10485761 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
            original_filename: "oversized_document.pdf",
            storage_path: "/storage/attachments/oversized_document.pdf",
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        },
      );
    },
  );

  const validDocumentAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "file",
          format: "pdf",
          size: 10485760 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0>,
          original_filename: "valid_document.pdf",
          storage_path: "/storage/attachments/valid_document.pdf",
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(validDocumentAttachment);
}
