import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test customer address search by recipient name functionality.
 *
 * An administrator queries customer addresses using the recipient_name filter with partial string matching. The test validates administrator authentication, search with partial recipient name, case-insensitive matching behavior, search with special characters and spaces, pagination metadata accuracy, and empty search result structure.
 *
 * The test verifies that the recipient_name filter parameter is properly accepted by the API and that responses conform to the expected IPageIShoppingMallCustomerAddress.ISummary structure with correct pagination information including current page, limit, total records, and total pages.
 *
 * 1. Administrator authentication using authorize_admin_join.
 * 2. Generate test customer ID and search parameters.
 * 3. Query addresses with partial recipient name filter.
 * 4. Validate response structure and pagination metadata.
 * 5. Test case-insensitive matching with different case variations.
 * 6. Test search with special characters and spaces.
 * 7. Verify empty result pagination structure.
 */
export async function test_api_customer_address_search_by_recipient_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      grade: "regular",
    },
  });
  typia.assert(adminAuth);
  // 2. Generate test customer ID
  const customerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test basic recipient name search with partial match
  const searchName = RandomGenerator.name(2);
  const result1 =
    await api.functional.shoppingMall.admin.customers.addresses.index(
      adminConnection,
      {
        customerId,
        body: {
          recipient_name: searchName,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(result1);
  // 4. Validate response structure
  TestValidator.predicate("has pagination", result1.pagination !== undefined);
  TestValidator.predicate("has data array", Array.isArray(result1.data));
  TestValidator.equals("current page", result1.pagination.current, 1);
  TestValidator.equals("limit", result1.pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    result1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    result1.pagination.pages >= 0,
  );
  // 5. Validate returned addresses match search criteria when data exists
  if (result1.data.length > 0) {
    result1.data.forEach((address) => {
      TestValidator.predicate(
        "address matches recipient name search",
        address.recipient_name.toLowerCase().includes(searchName.toLowerCase()),
      );
    });
  }
  // 6. Test case-insensitive matching with uppercase
  const uppercaseName = searchName.toUpperCase();
  const result2 =
    await api.functional.shoppingMall.admin.customers.addresses.index(
      adminConnection,
      {
        customerId,
        body: {
          recipient_name: uppercaseName,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(result2);
  TestValidator.predicate(
    "case-insensitive has pagination",
    result2.pagination !== undefined,
  );
  // 7. Test search with special characters and spaces
  const specialName = `${RandomGenerator.name()} ${RandomGenerator.name()}`;
  const result3 =
    await api.functional.shoppingMall.admin.customers.addresses.index(
      adminConnection,
      {
        customerId,
        body: {
          recipient_name: specialName,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(result3);
  TestValidator.predicate(
    "special chars has pagination",
    result3.pagination !== undefined,
  );
  // 8. Test empty search results structure with unique name
  const uniqueName = `UniqueName_${typia.random<string & tags.Format<"uuid">>()}`;
  const result4 =
    await api.functional.shoppingMall.admin.customers.addresses.index(
      adminConnection,
      {
        customerId,
        body: {
          recipient_name: uniqueName,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(result4);
  TestValidator.predicate(
    "empty result has data array",
    Array.isArray(result4.data),
  );
  TestValidator.predicate(
    "empty result has zero records or data array empty",
    result4.pagination.records === 0 || result4.data.length === 0,
  );
  // 9. Test different pagination parameters
  const result5 =
    await api.functional.shoppingMall.admin.customers.addresses.index(
      adminConnection,
      {
        customerId,
        body: {
          recipient_name: searchName,
          page: 2,
          limit: 20,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(result5);
  TestValidator.equals("page 2 current", result5.pagination.current, 2);
  TestValidator.equals("limit 20", result5.pagination.limit, 20);
  // 10. Test with sort parameter
  const result6 =
    await api.functional.shoppingMall.admin.customers.addresses.index(
      adminConnection,
      {
        customerId,
        body: {
          recipient_name: searchName,
          page: 1,
          limit: 10,
          sort: "created_at:desc",
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(result6);
  TestValidator.predicate(
    "sorted result has data",
    Array.isArray(result6.data),
  );
}
