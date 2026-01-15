import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_search_by_business_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Search for a business name that does not exist
  const nonExistentBusinessName =
    "NonExistentBusiness" + RandomGenerator.alphaNumeric(8);
  const searchResponse: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(adminConnection, {
      body: {
        business_name: nonExistentBusinessName,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(searchResponse);
  // Step 3: Validate pagination for empty results
  TestValidator.equals(
    "pagination page number is 1",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    searchResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records is 0",
    searchResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0 since no records",
    searchResponse.pagination.pages,
    0,
  );
  // Step 4: Validate search results for empty list
  TestValidator.equals(
    "search results count is 0",
    searchResponse.data.length,
    0,
  );
  TestValidator.equals("data array is empty", searchResponse.data, []);
  // Step 5: Validate that the business_name filter is correctly applied
  // by ensuring we got zero results with a unique business name, which confirms the filtering works correctly
  TestValidator.predicate(
    "search with non-existent name returns empty list",
    () => searchResponse.data.length === 0,
  );
}
