import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_list_invalid_date_format(
  connection: api.IConnection,
) {
  // Create admin account for authentication
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "admin12345",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Test with malformed date format in created_at_from field
  await TestValidator.error(
    "API should reject malformed date format in created_at_from",
    async () => {
      await api.functional.shoppingMall.admin.actors.sellers.index(connection, {
        body: {
          created_at_from: "not-a-date", // Invalid date format
        } satisfies IShoppingMallSeller.IRequest,
      });
    },
  );
}
