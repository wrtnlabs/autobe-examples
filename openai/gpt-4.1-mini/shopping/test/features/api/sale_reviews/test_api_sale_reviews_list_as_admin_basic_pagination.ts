import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleReview";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_sale_reviews_list_as_admin_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving a paginated list of sale reviews with no filters for admin user
  // 1. Prepare an administrator connection and authorize by join
  const adminConnection: api.IConnection = { host: connection.host };
  // IShoppingMallAdministrator.IJoin is an empty type according to definition
  // so we use an empty object
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Update admin connection with authorization header
  adminConnection.headers = { Authorization: authorized.token.access };
  // 2. Call the sale_reviews.index endpoint with empty body (no filters, default pagination)
  const body: IShoppingMallSaleReview.IRequest = {};
  const response =
    await api.functional.shoppingMall.administrator.sale_reviews.index(
      adminConnection,
      { body },
    );
  typia.assert(response);
  // 3. Validate response structure and pagination info presence
  // The response should have pagination with current, limit, records, pages
  // and data array of review summaries
  TestValidator.predicate(
    "pagination object exists",
    response.pagination !== undefined && response.pagination !== null,
  );
  TestValidator.predicate(
    "pagination current >= 0",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 4. Validate authorization enforcement - access should succeed, so no error thrown
  // Since tested successfully, this is implicitly verified
}
