import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_health_check_retrieval_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 2. Attempt unauthorized access with base connection (should throw error)
  await TestValidator.httpError(
    "unauthorized access with no auth",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.healthChecks.at(
        connection,
        { id: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
  // 3. Retrieve an existing health check record via authorized connection
  // Use a valid UUID
  const validId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const healthCheck =
    await api.functional.discussionBoard.administrator.healthChecks.at(
      adminConnection,
      { id: validId },
    );
  typia.assert(healthCheck);
}
