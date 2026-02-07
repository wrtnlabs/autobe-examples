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

export async function test_api_section_file_update_type_classification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create a discussion board section
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
  // 3. Upload initial file with incorrect MIME type (text file classified as image/jpeg)
  const initialFile =
    await generate_random_discussion_board_super_admin_sections_files_create(
      superAdminConnection,
      {
        params: {
          sectionId: section.id,
        },
        body: {
          filename: "document.txt",
          file_type: "image/jpeg", // Incorrect classification
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<5000>
          >(),
          file_path:
            "/uploads/sections/" +
            typia.random<string & tags.Format<"uuid">>() +
            ".txt",
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionFile.ICreate,
      },
    );
  typia.assert(initialFile);
  // 4. Update file_type to correct classification
  const updatedFile =
    await api.functional.discussionBoard.superAdmin.sections.files.update(
      superAdminConnection,
      {
        sectionId: section.id,
        fileId: initialFile.id,
        body: {
          file_type: "text/plain", // Correct classification
        } satisfies IDiscussionBoardSectionFile.IUpdate,
      },
    );
  typia.assert(updatedFile);
  // 5. Validate the update
  TestValidator.equals("file ID unchanged", updatedFile.id, initialFile.id);
  TestValidator.equals(
    "file_type corrected",
    updatedFile.file_type,
    "text/plain",
  );
  TestValidator.equals(
    "filename unchanged",
    updatedFile.filename,
    initialFile.filename,
  );
  TestValidator.equals(
    "file_size unchanged",
    updatedFile.file_size,
    initialFile.file_size,
  );
  TestValidator.equals(
    "file_path unchanged",
    updatedFile.file_path,
    initialFile.file_path,
  );
  TestValidator.equals(
    "description unchanged",
    updatedFile.description,
    initialFile.description,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(updatedFile.updated_at) > new Date(initialFile.updated_at),
  );
}