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

export async function test_api_section_file_update_filename_clarification(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create a discussion board section
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
  // Upload initial file with generic filename using utility function
  const initialFile =
    await generate_random_discussion_board_super_admin_sections_files_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          filename: "file.pdf",
          file_type: "application/pdf",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<5000>
          >(),
          file_path: `/sections/${section.id}/files/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionFile.ICreate,
      },
    );
  typia.assert(initialFile);
  // Update filename to more descriptive name (no utility function available, use SDK)
  const updatedFile =
    await api.functional.discussionBoard.superAdmin.sections.files.update(
      superAdminConnection,
      {
        sectionId: section.id,
        fileId: initialFile.id,
        body: {
          filename: "quarterly_financial_report_2024_q1.pdf",
        } satisfies IDiscussionBoardSectionFile.IUpdate,
      },
    );
  typia.assert(updatedFile);
  // Validate filename was updated
  TestValidator.equals(
    "filename should be updated",
    updatedFile.filename,
    "quarterly_financial_report_2024_q1.pdf",
  );
  // Validate other metadata remains unchanged
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
  TestValidator.equals(
    "file_type should remain unchanged",
    updatedFile.file_type,
    initialFile.file_type,
  );
  // Handle description null/undefined comparison properly
  if (
    initialFile.description !== null &&
    initialFile.description !== undefined
  ) {
    TestValidator.equals(
      "description should remain unchanged",
      updatedFile.description,
      initialFile.description,
    );
  } else {
    TestValidator.equals(
      "description should remain null/undefined",
      updatedFile.description,
      initialFile.description,
    );
  }
  // Validate updated_at timestamp reflects modification
  TestValidator.notEquals(
    "updated_at should be different",
    updatedFile.updated_at,
    initialFile.updated_at,
  );
  // Validate file remains associated with correct section
  TestValidator.equals(
    "file id should remain unchanged",
    updatedFile.id,
    initialFile.id,
  );
}
