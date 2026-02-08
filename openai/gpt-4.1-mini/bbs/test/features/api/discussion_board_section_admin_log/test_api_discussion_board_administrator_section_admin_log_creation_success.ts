import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_sections_admin_logs_create_admin_log } from "../../../generate/generate_random_discussion_board_administrator_sections_admin_logs_create_admin_log";
import { prepare_random_discussion_board_section_admin_log } from "../../../prepare/prepare_random_discussion_board_section_admin_log";

export async function test_api_discussion_board_administrator_section_admin_log_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Test successful creation of an administrative log entry for a discussion board section
  // Step 1: Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinOutput = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminJoinOutput);
  // Update adminConnection headers with authorized token
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminJoinOutput.token.access}`;
  // Step 2: Prepare a valid sectionId (UUID)
  const sectionId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  // Step 3: Prepare the administrative log creation body
  const administratorId = typia.random<string & tags.Format<"uuid">>();
  const actionType = "created";
  const body: IDiscussionBoardSectionAdminLog.ICreate = {
    administratorId,
    actionType,
    note: "Automated log entry for test",
  };
  // Step 4: Create an admin log using utility function
  const createdLog =
    await generate_random_discussion_board_administrator_sections_admin_logs_create_admin_log(
      adminConnection,
      {
        params: { sectionId },
        body,
      },
    );
  // Step 5: Assert the response
  typia.assert(createdLog);
}
