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

/**
 * Test the complete workflow of uploading a file to an existing section.
 * This scenario validates that an administrator can successfully create a section
 * and then attach supplementary files to it.
 */
export async function test_api_section_file_upload_basic_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Section creation
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. File upload
  const file = await api.functional.discussionBoard.admin.sections.files.create(
    adminConnection,
    {
      sectionId: section.id,
      body: {
        filename: "community_guidelines.pdf",
        file_type: "application/pdf",
        file_size: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<1000> &
            tags.Maximum<5000000>
        >(),
        file_path: `/sections/${section.id}/files/community_guidelines.pdf`,
        description:
          "Community guidelines document outlining platform rules and policies",
      } satisfies IDiscussionBoardSectionFile.ICreate,
    },
  );
  typia.assert(file);
  // 4. Validate response
  TestValidator.equals(
    "filename matches",
    file.filename,
    "community_guidelines.pdf",
  );
  TestValidator.equals("file_type matches", file.file_type, "application/pdf");
  TestValidator.predicate("file_size is positive", file.file_size > 0);
  TestValidator.predicate(
    "file_path contains section ID",
    file.file_path.includes(section.id),
  );
  TestValidator.equals(
    "description matches",
    file.description,
    "Community guidelines document outlining platform rules and policies",
  );
  // 5. Validate timestamps
  TestValidator.predicate("created_at is valid", file.created_at.length > 0);
  TestValidator.predicate("updated_at is valid", file.updated_at.length > 0);
}
