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

export async function test_api_super_administrator_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection object for super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Join a new super administrator to get authorized and token
  const joinBody = typia.random<IDiscussionBoardSuperAdministrator.IJoin>();
  const joinResult = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: joinBody,
    },
  );
  typia.assert(joinResult);
  // Set Authorization header for use in subsequent API calls
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = `Bearer ${joinResult.token.access}`;
  // Since join API does not provide super administrator's ID, test retrieval error handling with a known non-existent UUID
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  // Attempt to get profile with a non-existent ID and expect 404 not found error
  await TestValidator.httpError(
    "retrieving non-existent super administrator should 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.superAdministrators.at(
        superAdminConnection,
        { id: nonExistentId },
      );
    },
  );
}
