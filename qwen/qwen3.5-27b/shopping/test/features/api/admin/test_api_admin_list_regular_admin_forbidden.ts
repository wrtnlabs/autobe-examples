import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_list_regular_admin_forbidden(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a regular administrator (grade='regular') is denied access to the admin list endpoint with 403 Forbidden response.
   *
   * This test validates the security requirement that only super administrators can manage and monitor administrator accounts.
   * Regular administrators should be restricted from viewing other administrator accounts to maintain proper access control boundaries.
   */
  // 1. Authenticate as a regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Attempt to call the admin list endpoint with valid filter parameters
  await TestValidator.httpError(
    "regular admin cannot access admin list endpoint",
    403,
    async () =>
      await api.functional.shoppingMall.admin.admins.index(
        regularAdminConnection,
        {
          body: {
            page: 1,
            limit: 20,
          } satisfies IShoppingMallAdmin.IRequest,
        },
      ),
  );
}
