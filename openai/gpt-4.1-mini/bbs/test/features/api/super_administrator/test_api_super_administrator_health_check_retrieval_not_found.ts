import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test scenario for retrieving non-existent health check record.
 * This test ensures that the API returns 404 Not Found for a random UUID.
 */
export async function test_api_super_administrator_health_check_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator join and get authorized connection
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminJoinConnection,
    {
      body: {} satisfies IDiscussionBoardSuperAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Attempt to retrieve non-existent health check by random UUID
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "health check retrieval of non-existing ID should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.healthChecks.at(
        authorizedConnection,
        { id: randomUuid },
      );
    },
  );
}
