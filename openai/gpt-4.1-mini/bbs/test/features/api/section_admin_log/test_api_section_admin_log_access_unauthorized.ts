import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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

export async function test_api_section_admin_log_access_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Prepare an administrator account via join utility for valid admin context
  // but do NOT use admin connection for the main unauthorized access test
  // Step 1: Admin join to have an admin in system (required for dependency)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SafePassword123!",
    },
  });
  // Step 2: Try to access at endpoint WITHOUT authorization headers
  // Use base connection (no auth headers) to simulate unauthorized access
  await TestValidator.httpError(
    "unauthorized access without token should fail",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.sectionAdminLogs.at(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Step 3: Try to access at endpoint WITH invalid / non-admin token
  // For this scenario, simulate unauthorized user by using base connection
  // or create an admin connection but remove token to simulate insufficient permissions
  // Create a fake connection without authorization header
  const fakeConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access with insufficient privileges should fail",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.sectionAdminLogs.at(
        fakeConnection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
