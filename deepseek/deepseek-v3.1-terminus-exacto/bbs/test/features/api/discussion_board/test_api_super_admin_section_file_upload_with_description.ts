import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { generate_random_discussion_board_super_admin_sections_files_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_files_create";
import { prepare_random_discussion_board_section_file } from "../../../prepare/prepare_random_discussion_board_section_file";

export async function test_api_super_admin_section_file_upload_with_description(
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
  // Generate a random section ID
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: File upload with description
  const descriptionText = RandomGenerator.paragraph({ sentences: 2 });
  const fileWithDescription =
    await generate_random_discussion_board_super_admin_sections_files_create(
      superAdminConnection,
      {
        params: { sectionId },
        body: {
          filename: RandomGenerator.alphabets(10) + ".pdf",
          file_type: "application/pdf",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          file_path: "/uploads/" + RandomGenerator.alphabets(20) + ".pdf",
          description: descriptionText,
        },
      },
    );
  typia.assert(fileWithDescription);
  // Validate description is stored correctly
  TestValidator.equals(
    "description should match input",
    fileWithDescription.description,
    descriptionText,
  );
  // Test 2: File upload without description (undefined)
  const fileWithoutDescription =
    await generate_random_discussion_board_super_admin_sections_files_create(
      superAdminConnection,
      {
        params: { sectionId },
        body: {
          filename: RandomGenerator.alphabets(8) + ".jpg",
          file_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<2000000>
          >(),
          file_path: "/uploads/" + RandomGenerator.alphabets(15) + ".jpg",
        },
      },
    );
  typia.assert(fileWithoutDescription);
  // Verify both files have different IDs
  TestValidator.notEquals(
    "file IDs should be unique",
    fileWithDescription.id,
    fileWithoutDescription.id,
  );
}
