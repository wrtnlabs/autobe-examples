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

export async function test_api_section_file_deletion_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create a section
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
  const file =
    await generate_random_discussion_board_super_admin_sections_files_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          filename: RandomGenerator.alphabets(10) + ".txt",
          file_type: "text/plain",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          file_path: "/uploads/" + RandomGenerator.alphabets(10) + ".txt",
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionFile.ICreate,
      },
    );
  typia.assert(file);
  // 4. Delete the file
  await api.functional.discussionBoard.superAdmin.sections.files.erase(
    superAdminConnection,
    {
      sectionId: section.id,
      fileId: file.id,
    },
  );
  // 5. Verify deletion by attempting to retrieve the file (should fail)
  await TestValidator.error(
    "file should not exist after deletion",
    async () => {
      // Try to retrieve the deleted file - this should fail
      await api.functional.discussionBoard.superAdmin.sections.files.create(
        superAdminConnection,
        {
          sectionId: section.id,
          body: {
            filename: "test-retrieval.txt",
            file_type: "text/plain",
            file_size: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            file_path: "/uploads/test-retrieval.txt",
            description: "Test file for deletion verification",
          } satisfies IDiscussionBoardSectionFile.ICreate,
        },
      );
    },
  );
  // Additional validation: Verify that attempting to delete the same file again fails
  await TestValidator.error(
    "deleting non-existent file should fail",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.files.erase(
        superAdminConnection,
        {
          sectionId: section.id,
          fileId: file.id,
        },
      );
    },
  );
}
