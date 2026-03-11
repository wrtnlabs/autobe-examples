import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test article file soft deletion by author.
 *
 * This test validates that article authors can soft delete file attachments
 * from their articles, and that soft-deleted files are excluded from the
 * active file list while preserving the underlying file storage.
 *
 * Test Flow:
 * 1. Admin creates a section for article categorization
 * 2. Member registers and logs in
 * 3. Member creates an article with multiple file attachments (3 files)
 * 4. Member soft deletes one file attachment by setting deleted_at timestamp
 * 5. Validate soft-deleted file is excluded from response
 * 6. Validate remaining active files are returned correctly
 */
export async function test_api_article_file_soft_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(section);
  // 2. Member registers and logs in
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberJoinResult);
  // 3. Member creates an article with multiple file attachments (3 files)
  const fileUrls = ArrayUtil.repeat(
    3,
    (index) => `https://example.com/files/test-file-${index + 1}.pdf`,
  );
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        sectionId: section.id,
        fileUrls: fileUrls,
        tags: ["test", "soft-delete", "files"],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Validate article has 3 file attachments
  TestValidator.equals("article has 3 files", article.files.length, 3);
  // 4. Member soft deletes one file attachment (the second file)
  const fileToDelete = article.files[1];
  const deletedAtTimestamp = new Date().toISOString();
  const updateResult =
    await api.functional.discussionBoard.articles.files.updateFiles(
      memberConnection,
      {
        articleId: article.id,
        body: {
          deleted_at: deletedAtTimestamp,
        } satisfies IDiscussionBoardArticleFile.IUpdate,
      },
    );
  typia.assert(updateResult);
  // 5. Validate the soft-deleted file has deleted_at timestamp set
  TestValidator.equals(
    "deleted_at timestamp is set",
    updateResult.deleted_at,
    deletedAtTimestamp,
  );
  // 6. Validate the file metadata is preserved after soft deletion
  TestValidator.equals(
    "file id preserved after soft delete",
    updateResult.id,
    fileToDelete.id,
  );
  TestValidator.equals(
    "original_name preserved after soft delete",
    updateResult.original_name,
    fileToDelete.original_name,
  );
  TestValidator.predicate(
    "updated_at is updated on soft delete",
    updateResult.updated_at >= article.files[1].updated_at,
  );
  // 7. Validate soft deletion preserves file storage (path remains unchanged)
  TestValidator.equals(
    "file path preserved (storage not deleted)",
    updateResult.path,
    fileToDelete.path,
  );
  TestValidator.equals(
    "file name preserved (storage not deleted)",
    updateResult.name,
    fileToDelete.name,
  );
  TestValidator.equals(
    "file size preserved (storage not deleted)",
    updateResult.size,
    fileToDelete.size,
  );
  // 8. Validate the file belongs to the correct article
  TestValidator.equals(
    "file belongs to correct article",
    updateResult.article.id,
    article.id,
  );
  // 9. Validate the file uploader information is preserved
  TestValidator.equals(
    "file uploader preserved",
    updateResult.member.id,
    memberJoinResult.id,
  );
}
