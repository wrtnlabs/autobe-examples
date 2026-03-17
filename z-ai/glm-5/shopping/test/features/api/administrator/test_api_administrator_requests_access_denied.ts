import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorPasswordReset";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that regular administrators are denied access to administrator requests.
 *
 * Verifies authorization enforcement where only super administrators can view
 * administrator privilege requests. Regular administrators receive 403 Forbidden
 * (authenticated but not authorized) rather than 401 Unauthorized.
 */
export async function test_api_administrator_requests_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Create a regular administrator connection
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Verify that regular administrator receives 403 Forbidden
  await TestValidator.httpError(
    "regular admin denied access to administrator requests",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.administrator_requests.index(
        regularAdminConnection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IShoppingMallAdministratorPasswordReset.IRequest,
        },
      );
    },
  );
}
