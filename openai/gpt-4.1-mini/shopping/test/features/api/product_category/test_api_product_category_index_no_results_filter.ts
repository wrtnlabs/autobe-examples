import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_category_index_no_results_filter(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Retrieve product categories with empty filters. The DTO IRequest is empty, so no name/description filter possible.
  // 1. Administrator join to obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Prepare empty filter body as required by DTO
  const body: IShoppingMallProductCategory.IRequest = {};
  // 3. Call product categories index
  const output =
    await api.functional.shoppingMall.administrator.product.categories.index(
      adminConnection,
      {
        body: body,
      },
    );
  // 4. Assert output shape
  typia.assert(output);
  // 5. Validations
  // Data array must be defined (may be empty or not because no filter)
  TestValidator.predicate("data is array", Array.isArray(output.data));
  // Pagination properties check: current, limit, records, pages
  TestValidator.predicate(
    "pagination current is number >= 0",
    typeof output.pagination.current === "number" &&
      output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is number >= 0",
    typeof output.pagination.limit === "number" && output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is number >= 0",
    typeof output.pagination.records === "number" &&
      output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is number >= 0",
    typeof output.pagination.pages === "number" && output.pagination.pages >= 0,
  );
  // If records is zero then pages should be zero
  if (output.pagination.records === 0) {
    TestValidator.equals(
      "pages is zero when no records",
      output.pagination.pages,
      0,
    );
  }
}
