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

export async function test_api_section_file_metadata_update_soft_deleted_file(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as administrator
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create a discussion board section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Upload a file to the section
  const originalFile =
    await generate_random_discussion_board_admin_sections_files_create(
      adminConnection,
      {
        body: {
          filename: `${RandomGenerator.alphabets(8)}.txt`,
          file_type: "text/plain",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10000>
          >(),
          file_path: `/files/${typia.random<string & tags.Format<"uuid">>()}.txt`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionFile.ICreate,
        params: {
          sectionId: section.id,
        },
      },
    );
  typia.assert(originalFile);
  // Update metadata of the file (testing that metadata updates work on existing files)
  const updatedFile =
    await api.functional.discussionBoard.admin.sections.files.update(
      adminConnection,
      {
        sectionId: section.id,
        fileId: originalFile.id,
        body: {
          filename: `${RandomGenerator.alphabets(8)}_updated.txt`,
          file_type: "text/html",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSectionFile.IUpdate,
      },
    );
  typia.assert(updatedFile);
  // Validate that metadata was updated successfully
  TestValidator.notEquals(
    "filename should be updated",
    updatedFile.filename,
    originalFile.filename,
  );
  TestValidator.notEquals(
    "file_type should be updated",
    updatedFile.file_type,
    originalFile.file_type,
  );
  TestValidator.notEquals(
    "description should be updated",
    updatedFile.description,
    originalFile.description,
  );
  // Validate that other properties remain unchanged
  TestValidator.equals(
    "file_path should remain unchanged",
    updatedFile.file_path,
    originalFile.file_path,
  );
  TestValidator.equals(
    "file_size should remain unchanged",
    updatedFile.file_size,
    originalFile.file_size,
  );
  TestValidator.equals(
    "id should remain unchanged",
    updatedFile.id,
    originalFile.id,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedFile.created_at,
    originalFile.created_at,
  );
  // Note: Since no soft deletion endpoint is available in the provided API functions,
  // this test validates that metadata updates work correctly on existing files.
  // The soft deletion aspect would require a separate deletion endpoint.
}
