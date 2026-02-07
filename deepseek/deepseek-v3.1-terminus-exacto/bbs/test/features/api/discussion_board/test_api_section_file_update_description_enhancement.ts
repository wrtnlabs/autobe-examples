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

export async function test_api_section_file_update_description_enhancement(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a discussion board section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
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
  // Upload initial file without description
  const initialFile =
    await generate_random_discussion_board_super_admin_sections_files_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          filename: `test_file_${RandomGenerator.alphabets(5)}.txt`,
          file_type: "text/plain",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<5000>
          >(),
          file_path: `/uploads/sections/${section.id}/files/${typia.random<string & tags.Format<"uuid">>()}`,
          description: undefined,
        } satisfies IDiscussionBoardSectionFile.ICreate,
      },
    );
  typia.assert(initialFile);
  // Update file with comprehensive description
  const comprehensiveDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 12,
  });
  const updatedFile =
    await api.functional.discussionBoard.superAdmin.sections.files.update(
      superAdminConnection,
      {
        sectionId: section.id,
        fileId: initialFile.id,
        body: {
          description: comprehensiveDescription,
        } satisfies IDiscussionBoardSectionFile.IUpdate,
      },
    );
  typia.assert(updatedFile);
  // Validate the update was successful
  TestValidator.equals(
    "description should be updated",
    updatedFile.description,
    comprehensiveDescription,
  );
  TestValidator.equals(
    "file id should remain the same",
    updatedFile.id,
    initialFile.id,
  );
  TestValidator.equals(
    "filename should remain unchanged",
    updatedFile.filename,
    initialFile.filename,
  );
  TestValidator.equals(
    "file type should remain unchanged",
    updatedFile.file_type,
    initialFile.file_type,
  );
  TestValidator.equals(
    "file size should remain unchanged",
    updatedFile.file_size,
    initialFile.file_size,
  );
  TestValidator.equals(
    "file path should remain unchanged",
    updatedFile.file_path,
    initialFile.file_path,
  );
  TestValidator.predicate(
    "updated_at timestamp should be newer",
    new Date(updatedFile.updated_at) > new Date(initialFile.updated_at),
  );
}
