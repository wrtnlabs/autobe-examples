import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleFavorite";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFavorite";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_sale_favorites_report_filter_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator using join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  // Prepare filter criteria with customerId from an existing sale favorite or generate a new UUID
  // We will retrieve the list without filter first to get an existing customerId
  const initialResponse =
    await api.functional.shoppingMall.administrator.reports.sale_favorites.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(initialResponse);
  let filterCustomerId: string | undefined = undefined;
  if (initialResponse.data.length > 0) {
    filterCustomerId = initialResponse.data[0].customer.id;
  }
  // Construct request body with customer filter and pagination
  const requestBody: IShoppingMallSaleFavorite.IRequest = {
    customerId: filterCustomerId,
    page: 1,
    limit: 5,
    sort: "created_at",
  };
  // Call the sale favorites report API with filter
  const response =
    await api.functional.shoppingMall.administrator.reports.sale_favorites.index(
      adminConnection,
      { body: requestBody },
    );
  // Validate response structure
  typia.assert(response);
  // Validate pagination info
  TestValidator.predicate(
    "Pagination current page should be 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "Pagination limit should be 5",
    response.pagination.limit === 5,
  );
  TestValidator.predicate(
    "Pagination records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Pagination pages should be non-negative",
    response.pagination.pages >= 0,
  );
  // Validate each sale favorite's customer matches the filter (if filterCustomerId present)
  if (filterCustomerId !== undefined) {
    for (const favorite of response.data) {
      TestValidator.equals(
        "Favorite customer ID matches filter",
        favorite.customer.id,
        filterCustomerId,
      );
    }
  }
  // Validate data array length does not exceed limit
  TestValidator.predicate(
    "Response data length should be less than or equal to limit",
    response.data.length <= (requestBody.limit ?? 100),
  );
}
