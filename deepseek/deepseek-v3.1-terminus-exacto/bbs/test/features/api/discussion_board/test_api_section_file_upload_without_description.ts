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
 * Test uploading a file without the optional description field.
 * Validates that the file upload operation handles partial metadata correctly
 * when the optional description is omitted.
 */
export async function test_api_section_file_upload_without_description(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a target section
  const section = await generate_random_discussion_board_admin_sections_create(
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
  // Upload file without description field
  const fileData = {
    filename: `test_file_${RandomGenerator.alphabets(8)}.txt`,
    file_type: "text/plain",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1024>
    >(),
    file_path: `/uploads/sections/${section.id}/${RandomGenerator.alphabets(16)}.txt`,
    // description field intentionally omitted
  } satisfies IDiscussionBoardSectionFile.ICreate;
  const uploadedFile =
    await generate_random_discussion_board_admin_sections_files_create(
      adminConnection,
      {
        body: fileData,
        params: {
          sectionId: section.id,
        },
      },
    );
  typia.assert(uploadedFile);
  // Validate file metadata
  TestValidator.equals(
    "filename matches",
    uploadedFile.filename,
    fileData.filename,
  );
  TestValidator.equals(
    "file_type matches",
    uploadedFile.file_type,
    fileData.file_type,
  );
  TestValidator.equals(
    "file_size matches",
    uploadedFile.file_size,
    fileData.file_size,
  );
  TestValidator.equals(
    "file_path matches",
    uploadedFile.file_path,
    fileData.file_path,
  );
  // Validate that description is null when omitted
  TestValidator.equals(
    "description should be null",
    uploadedFile.description,
    null,
  );
}
