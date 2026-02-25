import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cancellation_request_snapshot_access_denied_non_administrator(
  connection: api.IConnection,
): Promise<void> {
  // We do not authenticate as administrator, so the access to the snapshot should be denied.
  // Attempt to fetch a random cancellation request snapshot id with no authentication
  await TestValidator.httpError(
    "access denied for non-administrator",
    403,
    async () => {
      // Direct call with base connection (unauthenticated)
      await api.functional.shoppingMall.administrator.cancellationRequestSnapshots.at(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Prepare a non-administrator connection by joining as an administrator (required dependency) but remove authorization header to simulate non-admin user
  // Instead, simulate a new connection object without headers (unauthenticated user)
  // Optionally, could test with a user connection if user login was provided, but only administrator join endpoint is given.
  // So the non-authenticated connection test is sufficient to verify 403.
}
