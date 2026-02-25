import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_request_deletion_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // This test validates deletion failure for non-existent administrator request ID.
  // Step 1: Authenticate as administrator via join.
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "abcdefgh",
    },
  });
  // Update adminConnection with authorization token
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = authorized.token.access;
  // Step 2: Attempt to delete non-existent administrator request ID.
  // Generate a random UUID which shouldn't exist.
  const randomId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Expect 404 Not Found error with proper message.
  await TestValidator.httpError(
    "delete non-existent administrator request ID",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.administratorRequests.erase(
        adminConnection,
        { administratorRequestId: randomId },
      );
    },
  );
}
