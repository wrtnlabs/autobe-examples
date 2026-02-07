import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_admin_sections_files_create } from "../../../generate/generate_random_discussion_board_admin_sections_files_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_file } from "../../../prepare/prepare_random_discussion_board_section_file";

export async function test_api_section_file_metadata_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Create a section
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Upload initial file with complete metadata
  const initialFile =
    await api.functional.discussionBoard.admin.sections.files.create(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          filename: RandomGenerator.name() + ".txt",
          file_type: "text/plain",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10000>
          >(),
          file_path: "/uploads/" + RandomGenerator.alphaNumeric(10) + ".txt",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSectionFile.ICreate,
      },
    );
  typia.assert(initialFile);
  // Store original values for comparison
  const originalFilename = initialFile.filename;
  const originalFileType = initialFile.file_type;
  const originalDescription = initialFile.description;
  const originalFileSize = initialFile.file_size;
  const originalFilePath = initialFile.file_path;
  const originalCreatedAt = initialFile.created_at;
  // Test 1: Update filename only
  const filenameUpdate =
    await api.functional.discussionBoard.admin.sections.files.update(
      adminConnection,
      {
        sectionId: section.id,
        fileId: initialFile.id,
        body: {
          filename: "updated_filename.txt",
        } satisfies IDiscussionBoardSectionFile.IUpdate,
      },
    );
  typia.assert(filenameUpdate);
  TestValidator.equals(
    "filename should be updated",
    filenameUpdate.filename,
    "updated_filename.txt",
  );
  TestValidator.equals(
    "file_type should remain unchanged",
    filenameUpdate.file_type,
    originalFileType,
  );
  TestValidator.equals(
    "description should remain unchanged",
    filenameUpdate.description,
    originalDescription,
  );
  TestValidator.equals(
    "file_size should remain unchanged",
    filenameUpdate.file_size,
    originalFileSize,
  );
  TestValidator.equals(
    "file_path should remain unchanged",
    filenameUpdate.file_path,
    originalFilePath,
  );
  TestValidator.notEquals(
    "updated_at should change",
    filenameUpdate.updated_at,
    initialFile.updated_at,
  );
  // Test 2: Update description only
  const descriptionUpdate =
    await api.functional.discussionBoard.admin.sections.files.update(
      adminConnection,
      {
        sectionId: section.id,
        fileId: initialFile.id,
        body: {
          description: "Updated description text",
        } satisfies IDiscussionBoardSectionFile.IUpdate,
      },
    );
  typia.assert(descriptionUpdate);
  TestValidator.equals(
    "filename should remain unchanged",
    descriptionUpdate.filename,
    "updated_filename.txt",
  );
  TestValidator.equals(
    "file_type should remain unchanged",
    descriptionUpdate.file_type,
    originalFileType,
  );
  TestValidator.equals(
    "description should be updated",
    descriptionUpdate.description,
    "Updated description text",
  );
  TestValidator.equals(
    "file_size should remain unchanged",
    descriptionUpdate.file_size,
    originalFileSize,
  );
  TestValidator.equals(
    "file_path should remain unchanged",
    descriptionUpdate.file_path,
    originalFilePath,
  );
  TestValidator.notEquals(
    "updated_at should change again",
    descriptionUpdate.updated_at,
    filenameUpdate.updated_at,
  );
  // Test 3: Update file_type only
  const fileTypeUpdate =
    await api.functional.discussionBoard.admin.sections.files.update(
      adminConnection,
      {
        sectionId: section.id,
        fileId: initialFile.id,
        body: {
          file_type: "application/pdf",
        } satisfies IDiscussionBoardSectionFile.IUpdate,
      },
    );
  typia.assert(fileTypeUpdate);
  TestValidator.equals(
    "filename should remain unchanged",
    fileTypeUpdate.filename,
    "updated_filename.txt",
  );
  TestValidator.equals(
    "file_type should be updated",
    fileTypeUpdate.file_type,
    "application/pdf",
  );
  TestValidator.equals(
    "description should remain unchanged",
    fileTypeUpdate.description,
    "Updated description text",
  );
  TestValidator.equals(
    "file_size should remain unchanged",
    fileTypeUpdate.file_size,
    originalFileSize,
  );
  TestValidator.equals(
    "file_path should remain unchanged",
    fileTypeUpdate.file_path,
    originalFilePath,
  );
  TestValidator.notEquals(
    "updated_at should change for third update",
    fileTypeUpdate.updated_at,
    descriptionUpdate.updated_at,
  );
  // Verify immutable fields remain unchanged throughout all updates
  TestValidator.equals(
    "created_at should never change",
    fileTypeUpdate.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "id should never change",
    fileTypeUpdate.id,
    initialFile.id,
  );
}
