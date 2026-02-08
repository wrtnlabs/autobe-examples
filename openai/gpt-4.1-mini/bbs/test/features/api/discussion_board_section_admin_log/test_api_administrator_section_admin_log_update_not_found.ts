import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_admin_log } from "../../../prepare/prepare_random_discussion_board_section_admin_log";

export async function test_api_administrator_section_admin_log_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Update adminConnection headers with access token
  adminConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a new discussion board section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(section);
  // 3. Create an admin log entry for the section
  const adminLog =
    await generate_random_discussion_board_administrator_sections_admin_logs_create_admin_log(
      adminConnection,
      { params: { sectionId: (section as any)["section_id"] ?? (section as any)["id"] ?? "" }, body: {} },
    );
  typia.assert(adminLog);
  // 4. Prepare a non-existing adminLogId to test update not found
  const nonExistingAdminLogId = typia.random<string & tags.Format<"uuid">>();
  // 5. Prepare update body with realistic values
  const updateBody: Partial<IDiscussionBoardSectionAdminLog.IUpdate> = {};
  // 6. Attempt to update admin log with non-existing adminLogId
  // Expecting an HTTP error such as 404 Not Found
  await TestValidator.httpError(
    "attempt to update non-existing admin log",
    404,
    async () =>
      await api.functional.discussionBoard.administrator.sections.adminLogs.updateAdminLog(
        adminConnection,
        {
          sectionId: (section as any)["section_id"] ?? (section as any)["id"] ?? "",
          adminLogId: nonExistingAdminLogId,
          body: updateBody,
        },
      ),
  );
}
