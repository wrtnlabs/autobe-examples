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

export async function test_api_discussion_board_section_admin_logs_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorization = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Use a valid UUID for sectionId
  const sectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Prepare request body (empty, as IRequest has no defined properties)
  const requestBody: IDiscussionBoardSectionAdminLog.IRequest = {};
  // 4. Retrieve admin logs
  const logsPage =
    await api.functional.discussionBoard.administrator.sections.adminLogs.index(
      adminConnection,
      {
        sectionId,
        body: requestBody,
      },
    );
  // 5. Validate response
  typia.assert(logsPage);
  // 6. Basic pagination validation
  TestValidator.predicate(
    "pagination current page should be >= 1",
    logsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    logsPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    logsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    logsPage.pagination.pages >= 0,
  );
  // 7. Validate each admin log entry
  for (const log of logsPage.data) {
    typia.assert(log);
  }
  // 8. Confirm that unauthorized roles fail to access
  await TestValidator.httpError(
    "should reject unauthorized access",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.sections.adminLogs.index(
        connection,
        {
          sectionId,
          body: requestBody,
        },
      );
    },
  );
}
