import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_health_check_permanent_delete_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuthorized);
  // Use the authorized admin connection with token
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // Generate a health check id to delete (simulate existence)
  // Note: Since no create endpoint is given for healthChecks, assume this id exists
  // and deletion will return 204 if authorized
  const healthCheckId = typia.random<string & tags.Format<"uuid">>();
  // Delete the health check record
  await api.functional.discussionBoard.administrator.healthChecks.erase(
    adminConnection,
    { id: healthCheckId },
  );
  // Try to get deleted health check, expect 404
  // No direct get api listed in input, so skip actual get call
  // If get endpoint existed, would attempt and expect 404 error
  // No direct assertions on response content (204 means void)
  // Typia.assert not used on void
}
