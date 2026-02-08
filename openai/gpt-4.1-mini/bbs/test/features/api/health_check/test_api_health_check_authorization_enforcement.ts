import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardHealthCheck";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_health_check_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for unauthorized access (no auth headers)
  const anonymousConnection: api.IConnection = { host: connection.host };
  // Attempt to access health check endpoint anonymously
  await TestValidator.httpError(
    "anonymous access denied",
    [401, 403],
    async () =>
      await api.functional.discussionBoard.superAdministrator.healthChecks.index(
        anonymousConnection,
        { body: {} },
      ),
  );
  // Simulate regular administrator connection (no utility given, so just anonymous as placeholder)
  // Since no utility or skd for regular admin login provided, cannot fully test this role
  // Create super administrator by join to obtain authorization
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminJoinConnection,
    {
      body: {},
    },
  );
  // Create authorized connection with super admin token
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorized.token.access}` },
  };
  // Successfully access the health check endpoint with super admin authorization
  const response =
    await api.functional.discussionBoard.superAdministrator.healthChecks.index(
      superAdminConnection,
      { body: {} },
    );
  typia.assert(response);
}
