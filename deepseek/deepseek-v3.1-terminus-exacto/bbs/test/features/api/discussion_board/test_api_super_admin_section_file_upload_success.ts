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

export async function test_api_super_admin_section_file_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Generate a random section ID for the file upload
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Generate random file data with stored values for validation
  const filename = RandomGenerator.alphabets(10) + ".txt";
  const filePath = "/uploads/" + RandomGenerator.alphabets(8) + ".txt";
  const description = RandomGenerator.paragraph({ sentences: 2 });
  // Create section file using utility function
  const file =
    await generate_random_discussion_board_super_admin_sections_files_create(
      superAdminConnection,
      {
        params: { sectionId },
        body: {
          filename,
          file_type: "text/plain",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          file_path: filePath,
          description,
        } satisfies IDiscussionBoardSectionFile.ICreate,
      },
    );
  typia.assert(file);
  // Validate response contains complete file metadata
  TestValidator.equals("filename matches input", file.filename, filename);
  TestValidator.equals("file_type matches input", file.file_type, "text/plain");
  TestValidator.predicate("file_size is non-negative", file.file_size >= 0);
  TestValidator.equals("file_path matches input", file.file_path, filePath);
  TestValidator.equals(
    "description matches input",
    file.description,
    description,
  );
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(file.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(new Date(file.updated_at).getTime()),
  );
}
