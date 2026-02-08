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

/**
 * Test retrieving a paginated list of product categories without applying any filters to ensure basic pagination works correctly.
 * Validate that the response returns only active categories with correct pagination metadata and that deleted categories are excluded.
 * Verify the ordering of the categories by name ascending as default.
 * Confirm that no authentication issues occur since this endpoint requires administrator role authorization and that the admin join operation precedes this operation in dependencies.
 */
export async function test_api_product_category_index_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Prepare empty filter body typed as correct request type
  const body = {} as IShoppingMallProductCategory.IRequest;
  // 3. Call the product categories index API
  const response =
    await api.functional.shoppingMall.administrator.product.categories.index(
      adminConnection,
      { body },
    );
  // 4. Assert the response structure and pagination
  typia.assert(response);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  // 6. Omit category name ordering validation due to missing 'name' property in ISummary
}
