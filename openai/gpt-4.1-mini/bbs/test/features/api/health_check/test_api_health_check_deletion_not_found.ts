import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_health_check_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator join and authorization
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(authorized);
  // Attach token to connection for subsequent calls
  superAdminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Attempt delete with a random non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify unauthorized access is rejected
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized delete attempt",
    401,
    async () =>
      await api.functional.discussionBoard.superAdministrator.healthChecks.erase(
        unauthorizedConnection,
        { id: nonExistentId },
      ),
  );
  // 4. Verify delete returns 404 Not Found for non-existent id
  await TestValidator.httpError(
    "delete non-existent health check returns 404",
    404,
    async () =>
      await api.functional.discussionBoard.superAdministrator.healthChecks.erase(
        superAdminConnection,
        { id: nonExistentId },
      ),
  );
}
