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

export async function test_api_discussion_board_section_admin_log_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator (join)
  const adminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = { Authorization: `Bearer ${auth.token.access}` };
  // 2. Create a discussion board section
  const sectionRaw =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      { body: {} },
    );
  const section = typia.assert<IEntity>(sectionRaw);
  // 3. Create an admin log entry for the section
  const adminLogRaw =
    await generate_random_discussion_board_administrator_sections_admin_logs_create_admin_log(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: {},
      },
    );
  const adminLog = typia.assert<IEntity>(adminLogRaw);
  // 4. Delete the created admin log entry
  await api.functional.discussionBoard.administrator.sections.adminLogs.erase(
    adminConnection,
    {
      sectionId: section.id,
      adminLogId: adminLog.id,
    },
  );
  // 5. Confirm deletion by attempting to delete again should produce error
  await TestValidator.error("admin log delete twice", async () => {
    await api.functional.discussionBoard.administrator.sections.adminLogs.erase(
      adminConnection,
      {
        sectionId: section.id,
        adminLogId: adminLog.id,
      },
    );
  });
  // Note: validation of no side effects on section or other logs is limited in E2E.
}
