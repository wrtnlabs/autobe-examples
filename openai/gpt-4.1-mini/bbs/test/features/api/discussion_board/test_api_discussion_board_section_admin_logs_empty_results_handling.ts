import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionAdminLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_discussion_board_section_admin_logs_empty_results_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and authenticates to get adminConnection
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Generate an existing sectionId that has no admin logs for test
  // Since the scenario requires a sectionId existing but WITH NO admin logs,
  // we pick a random UUID here. In real setup, you might create a section first.
  // However, since no section creation API in provided dependencies, we rely on a random UUID
  // for test to simulate existing section without any logs.
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare request body - empty request (IDiscussionBoardSectionAdminLog.IRequest is empty)
  const body = {} satisfies IDiscussionBoardSectionAdminLog.IRequest;
  // 4. Query for admin logs
  const result =
    await api.functional.discussionBoard.administrator.sections.adminLogs.index(
      adminConnection,
      {
        sectionId,
        body,
      },
    );
  typia.assert(result);
  // 5. Validate the response
  // - data is empty list
  // - pagination properties show zero records
  TestValidator.equals("admin logs data empty", result.data.length, 0);
  TestValidator.equals(
    "admin logs pagination current page",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "admin logs pagination limit",
    result.pagination.limit,
    0,
  );
  TestValidator.equals(
    "admin logs pagination records",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "admin logs pagination pages",
    result.pagination.pages,
    0,
  );
}
