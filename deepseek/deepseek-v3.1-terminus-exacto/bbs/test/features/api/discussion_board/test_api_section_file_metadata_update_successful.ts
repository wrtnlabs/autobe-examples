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

export async function test_api_section_file_metadata_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
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
  // Create a section
  const section = await generate_random_discussion_board_admin_sections_create(
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
  // Upload initial file
  const initialFile =
    await generate_random_discussion_board_admin_sections_files_create(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: {
          filename: RandomGenerator.paragraph({ sentences: 1 }),
          file_type: RandomGenerator.pick(["pdf", "docx", "txt"] as const),
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<5000>
          >(),
          file_path: `/uploads/${typia.random<string & tags.Format<"uuid">>()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSectionFile.ICreate,
      },
    );
  typia.assert(initialFile);
  // Update file metadata
  const updateData = {
    filename: RandomGenerator.paragraph({ sentences: 1 }),
    file_type: RandomGenerator.pick(["pdf", "docx", "txt"] as const),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardSectionFile.IUpdate;
  const updatedFile =
    await api.functional.discussionBoard.admin.sections.files.update(
      adminConnection,
      {
        sectionId: section.id,
        fileId: initialFile.id,
        body: updateData,
      },
    );
  typia.assert(updatedFile);
  // Validate metadata updates
  TestValidator.equals(
    "filename should be updated",
    updatedFile.filename,
    updateData.filename,
  );
  TestValidator.equals(
    "file_type should be updated",
    updatedFile.file_type,
    updateData.file_type,
  );
  TestValidator.equals(
    "description should be updated",
    updatedFile.description,
    updateData.description,
  );
  // Validate system-managed fields remain unchanged
  TestValidator.equals(
    "file_path should remain unchanged",
    updatedFile.file_path,
    initialFile.file_path,
  );
  TestValidator.equals(
    "file_size should remain unchanged",
    updatedFile.file_size,
    initialFile.file_size,
  );
  // Validate timestamp updates
  TestValidator.predicate(
    "updated_at should be refreshed",
    updatedFile.updated_at > initialFile.updated_at,
  );
  // Validate all metadata fields are present
  TestValidator.predicate("id should be present", updatedFile.id !== undefined);
  TestValidator.predicate(
    "created_at should be present",
    updatedFile.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should be present",
    updatedFile.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at should be null",
    updatedFile.deleted_at === null,
  );
}
