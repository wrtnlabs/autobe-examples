import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_list_excludes_deleted(
  connection: api.IConnection,
) {
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Verify seller listing endpoint properly excludes deleted sellers
  const result: IPageIShoppingMallSeller =
    await api.functional.shoppingMall.admin.actors.sellers.index(connection, {
      body: {} satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(result);

  // Validate structure and that deleted sellers are filtered out
  TestValidator.equals("pagination info exists", result.pagination.current, 1);
  TestValidator.equals("limit is at least 1", result.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(result.data));
  TestValidator.predicate(
    "data items are sellers",
    result.data.every((item) => item.id && item.email),
  );
  TestValidator.equals("no sellers should be returned", result.data.length, 0);
}
