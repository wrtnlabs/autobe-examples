import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_system_version_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to update a system version record without administrator authentication. Expect access denied or unauthorized error response.
  // Use only the base connection without authorization.
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Compose update data with random change description and changed_by info.
  const body = {
    change_description: "Attempt unauthorized update",
    changed_by: "unauthorized user",
  } satisfies IShoppingMallSystemVersion.IUpdate;
  // Use a random UUID for the system version id.
  const id = typia.random<string & tags.Format<"uuid">>();
  // Expect an HttpError with 401 Unauthorized or 403 Forbidden status.
  await TestValidator.httpError(
    "update system version without auth should fail",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.systemVersions.update(
        unauthorizedConnection,
        { id, body },
      );
    },
  );
}
