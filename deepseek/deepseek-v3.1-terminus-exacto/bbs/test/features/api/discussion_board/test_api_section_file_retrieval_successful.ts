import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_file } from "../../../prepare/prepare_random_discussion_board_section_file";

/**
 * Test successful retrieval of a file attached to a section.
 * This scenario validates that a super administrator can successfully retrieve
 * a file that has been uploaded to a section. The test verifies that the file
 * content is returned with appropriate metadata including filename, file type,
 * file size, file path, and description.
 */
export async function test_api_section_file_retrieval_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create a section for file attachment
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Upload a file to the section
  const uploadedFile =
    await generate_random_discussion_board_super_admin_sections_files_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          filename: `test-file-${RandomGenerator.alphabets(8)}.txt`,
          file_type: "text/plain",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
          >(),
          file_path: `/uploads/sections/${section.id}/${RandomGenerator.alphabets(16)}.txt`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSectionFile.ICreate,
      },
    );
  typia.assert(uploadedFile);
  // 4. Retrieve the file using section ID and file ID
  const retrievedFile =
    await api.functional.discussionBoard.superAdmin.sections.files.at(
      superAdminConnection,
      {
        sectionId: section.id,
        fileId: uploadedFile.id,
      },
    );
  typia.assert(retrievedFile);
  // 5. Validate that the retrieved file matches the uploaded file metadata
  TestValidator.equals("file ID matches", retrievedFile.id, uploadedFile.id);
  TestValidator.equals(
    "filename matches",
    retrievedFile.filename,
    uploadedFile.filename,
  );
  TestValidator.equals(
    "file type matches",
    retrievedFile.file_type,
    uploadedFile.file_type,
  );
  TestValidator.equals(
    "file size matches",
    retrievedFile.file_size,
    uploadedFile.file_size,
  );
  TestValidator.equals(
    "file path matches",
    retrievedFile.file_path,
    uploadedFile.file_path,
  );
  TestValidator.equals(
    "description matches",
    retrievedFile.description,
    uploadedFile.description,
  );
  // 6. Verify file has not been soft-deleted
  TestValidator.predicate(
    "file is not deleted",
    retrievedFile.deleted_at === null,
  );
}
