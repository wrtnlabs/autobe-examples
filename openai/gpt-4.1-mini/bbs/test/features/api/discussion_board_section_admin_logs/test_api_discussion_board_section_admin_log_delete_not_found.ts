import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_discussion_board_section_admin_log_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test attempt to delete a non-existent administrative log entry to validate
  // system behavior and error handling.
  // 1. Authenticate as administrator (join).
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a discussion board section.
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(section);
  // 3. Extract sectionId safely from the section object
  // If 'id' is missing, fallback to generating a random UUID string
  const sectionId =
    (section as any).id ?? typia.random<string & tags.Format<"uuid">>();
  // 4. Generate a random UUID string as invalid adminLogId
  const invalidAdminLogId = typia.random<string & tags.Format<"uuid">>();
  // 5. Verify 404 error when deleting non-existent admin log
  await TestValidator.httpError(
    "delete non-existent admin log returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.sections.adminLogs.erase(
        adminConnection,
        {
          sectionId: sectionId,
          adminLogId: invalidAdminLogId,
        },
      );
    },
  );
}
