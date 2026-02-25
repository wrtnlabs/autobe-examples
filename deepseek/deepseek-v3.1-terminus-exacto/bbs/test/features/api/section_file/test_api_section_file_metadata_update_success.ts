import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_super_admin_sections_files_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_files_create";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test successful metadata update of a section file by a super administrator.
 * Create a new section, upload a file to the section, then update the file's
 * description field. Verify that only the description is updated while immutable
 * fields (filename, file_type, file_size, file_path) remain unchanged.
 * Validate the response contains the complete updated file entity with the new
 * description and proper timestamps.
 *
 * Note: The create endpoint returns IDiscussionBoardArticleFile (article file)
 * while update returns IDiscussionBoardSectionFile (section file). We extract
 * attachment file metadata from the created article file for comparison with
 * the updated section file properties.
 */
export async function test_api_section_file_metadata_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create a section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          status: "active",
          display_order: typia.random<
            number & tags.Type<"int32">
          >() satisfies number as number,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Create a file attachment in the section (returns article file)
  const articleFile =
    await generate_random_discussion_board_super_admin_sections_files_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<
            number & tags.Type<"int32">
          >() satisfies number as number,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(articleFile);
  // Extract attachment file metadata for comparison
  const attachmentFile = articleFile.attachment_file;
  // 4. Update file description (returns section file)
  const newDescription = RandomGenerator.content({ paragraphs: 2 });
  const sectionFile =
    await api.functional.discussionBoard.superAdmin.sections.files.update(
      superAdminConnection,
      {
        sectionId: section.id,
        fileId: articleFile.id, // Use article file ID for update
        body: {
          description: newDescription,
        } satisfies IDiscussionBoardSectionFile.IUpdate,
      },
    );
  typia.assert(sectionFile);
  // 5. Validate immutable fields remain unchanged
  // Compare section file properties with article file's attachment file properties
  TestValidator.equals(
    "filename unchanged",
    sectionFile.filename,
    attachmentFile.filename,
  );
  TestValidator.equals(
    "file_type unchanged (maps to mime_type)",
    sectionFile.file_type,
    attachmentFile.mime_type,
  );
  TestValidator.equals(
    "file_size unchanged",
    sectionFile.file_size,
    attachmentFile.file_size,
  );
  TestValidator.equals(
    "file_path unchanged (maps to storage_path)",
    sectionFile.file_path,
    attachmentFile.storage_path,
  );
  // 6. Validate description is updated
  TestValidator.equals(
    "description updated",
    sectionFile.description,
    newDescription,
  );
  TestValidator.notEquals(
    "description changed from null (if original was null)",
    sectionFile.description,
    null,
  );
  // 7. Validate timestamps
  TestValidator.predicate(
    "created_at exists",
    sectionFile.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    sectionFile.updated_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(Date.parse(sectionFile.updated_at)),
  );
  // 8. Validate complete entity structure
  TestValidator.equals("id unchanged", sectionFile.id, articleFile.id);
  TestValidator.predicate(
    "deleted_at is null (file not deleted)",
    sectionFile.deleted_at === null,
  );
}
