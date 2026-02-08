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

export async function test_api_section_admin_log_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that a non-administrator user cannot access a discussion board section admin log.
  // 1. Perform administrator join to get authorized admin connection (preparation only).
  // 2. Attempt to access admin log with base (unauthenticated) connection.
  // 3. Assert that the access throws an authorization error (HTTP 403).
  // 1. Administrator joins to establish admin context
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // 2. Use base connection (not authorized as admin) to attempt to access admin log
  const baseConnection: api.IConnection = { host: connection.host };
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const adminLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect HTTP 403 Forbidden error
  await TestValidator.httpError(
    "Non-admin cannot access section admin log",
    403,
    async () => {
      await api.functional.discussionBoard.administrator.sections.adminLogs.at(
        baseConnection,
        { sectionId, adminLogId },
      );
    },
  );
}
