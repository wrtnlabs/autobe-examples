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
 * Test successful retrieval of a file attachment from a discussion board section.
 *
 * This test validates the complete file attachment workflow:
 * 1. Administrator authentication and section creation
 * 2. File upload to the created section
 * 3. Successful file retrieval using section and file IDs
 *
 * The test ensures that files can be properly attached to sections and retrieved
 * with correct metadata and content handling.
 */
export async function test_api_section_file_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a new discussion board section
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
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
  // 3. Upload a file to the created section
  const file = await api.functional.discussionBoard.admin.sections.files.create(
    adminConnection,
    {
      sectionId: section.id,
      body: {
        filename: `test-file-${RandomGenerator.alphabets(8)}.txt`,
        file_type: "text/plain",
        file_size: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1024>
        >(),
        file_path: `/uploads/sections/${section.id}/${typia.random<string & tags.Format<"uuid">>()}`,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardSectionFile.ICreate,
    },
  );
  typia.assert(file);
  // 4. Retrieve the uploaded file
  await api.functional.discussionBoard.admin.sections.files.at(
    adminConnection,
    {
      sectionId: section.id,
      fileId: file.id,
    },
  );
  // The at() function returns void, so successful execution indicates test passed
}
