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

export async function test_api_super_administrator_administrator_request_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator using join utility
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = `Bearer ${superAdmin.token.access}`;
  // 2. Prepare a random UUID for a non-existent administrator request
  const fakeRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete the non-existent administrator request
  //    Expect HTTP 404 Not Found error to be thrown
  await TestValidator.httpError(
    "delete non-existent administrator request should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.requests.erase(
        superAdminConnection,
        { requestId: fakeRequestId },
      );
    },
  );
}
