import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPasswordReset";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_request_rejection_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a regular administrator
  // New administrators are assigned 'regular' grade by default
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_administrator_join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(regularAdmin);
  // Verify the administrator has 'regular' grade
  TestValidator.equals("regular admin grade", regularAdmin.grade, "regular");
  // Step 2: Use a random UUID for administrator request
  // Permission check (403) occurs before request existence check (404)
  const administratorRequestId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt to reject with regular administrator credentials
  // Expected: 403 Forbidden because regular admins cannot reject requests
  await TestValidator.httpError(
    "regular admin cannot reject administrator requests",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.administrator_requests.reject(
        regularAdminConnection,
        {
          administratorRequestId,
        },
      );
    },
  );
}
