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

export async function test_api_administrator_administrator_request_deletion_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that a user without administrator privileges
  // cannot delete an administrator request, and the operation must be forbidden.
  // 1. Create a new connection as a non-administrator user (no authentication done).
  const userConnection: api.IConnection = { host: connection.host };
  // 2. Generate a random UUID for administratorRequestId to attempt deletion.
  const fakeAdministratorRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to delete the administrator request using the non-admin connection.
  // Expect an HTTP 403 Forbidden error.
  await TestValidator.httpError(
    "delete administrator request without admin privileges",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.administratorRequests.erase(
        userConnection,
        { administratorRequestId: fakeAdministratorRequestId },
      );
    },
  );
}
