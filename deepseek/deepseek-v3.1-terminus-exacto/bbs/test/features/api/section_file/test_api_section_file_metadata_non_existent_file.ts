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
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_file_metadata_non_existent_file(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authenticatedSuperAdmin =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & typia.tags.Format<"email">>(),
          password: typia.random<string & typia.tags.Format<"password">>(),
          href: typia.random<string & typia.tags.Format<"uri">>(),
          referrer: typia.random<string & typia.tags.Format<"uri">>(),
          ip: typia.random<string & typia.tags.Format<"ipv4">>(),
        },
      },
    );
  typia.assert(authenticatedSuperAdmin);
  // Create a valid section
  const section =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: typia.random<string>(),
          description: typia.random<string>(),
          status: "active",
          display_order: typia.random<
            number &
              typia.tags.Type<"int32"> &
              typia.tags.Minimum<1> &
              typia.tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(section);
  // Attempt to update metadata for a non-existent file using invalid file ID
  const invalidFileId = typia.random<string & typia.tags.Format<"uuid">>();
  await TestValidator.error(
    "update metadata for non-existent file should return error",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.files.update(
        superAdminConnection,
        {
          sectionId: section.id,
          fileId: invalidFileId,
          body: {
            description: typia.random<string>(),
          },
        },
      );
    },
  );
}
