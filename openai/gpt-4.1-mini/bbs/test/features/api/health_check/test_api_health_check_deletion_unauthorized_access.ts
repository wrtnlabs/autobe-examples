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

export async function test_api_health_check_deletion_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Attempt deletion without any authentication
  await TestValidator.httpError(
    "unauthorized delete without auth",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.healthChecks.erase(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Attempt deletion with invalid/forged token
  const fakeConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalid.token.here" },
  };
  await TestValidator.httpError(
    "unauthorized delete with invalid token",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.healthChecks.erase(
        fakeConnection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
