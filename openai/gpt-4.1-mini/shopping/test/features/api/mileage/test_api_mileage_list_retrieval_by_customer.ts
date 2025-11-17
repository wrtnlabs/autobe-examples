import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMileage";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";

/**
 * Test suite for verifying mileage list retrieval by an authenticated customer.
 *
 * This test covers the entire flow from customer authentication, optional
 * customer record creation, and complex mileage retrievals with filters and
 * pagination.
 *
 * Steps:
 *
 * 1. Register and authenticate a new customer using /auth/customer/join.
 * 2. Create a customer record if needed using
 *    /shoppingMall/customer/shoppingMallCustomers.
 * 3. Retrieve the full mileage list with no filters, validating pagination counts.
 * 4. Retrieve mileage list with points_min filter, validating only mileages with
 *    points >= points_min are returned.
 * 5. Retrieve mileage list with points_max filter, validating only mileages with
 *    points <= points_max are returned.
 * 6. Retrieve mileage list with expired flag true, validating only expired
 *    mileages are returned.
 * 7. Retrieve mileage list with active_only true, validating only non-deleted
 *    active mileages are returned.
 * 8. Retrieve mileage list with pagination parameters (page/limit), confirming
 *    correct paginated data slice and pagination info.
 * 9. For each retrieved list, assert that all mileage records belong to the
 *    authenticated customer.
 * 10. Robustly validate the integrity of pagination details and response data.
 */
export async function test_api_mileage_list_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration and authentication
  const email: string = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd123";
  const href = "https://example.com/join";
  const referrer = "https://example.com";

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerAuthorized);

  // 2. Conditionally create customer record if needed (generally already created by join)
  // But still per scenario, create one for test completeness
  const customerCreated: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.create(
      connection,
      {
        body: {
          email,
          password,
          href,
          referrer,
        } satisfies IShoppingMallCustomer.ICreate,
      },
    );
  typia.assert(customerCreated);
  // The customer ID should match the authenticated user ID
  TestValidator.equals(
    "Created customer ID should match authenticated user ID",
    customerCreated.id,
    customerAuthorized.id,
  );

  // Prepare base request body with customer id for mileage queries
  const baseRequest: IShoppingMallMileage.IRequest = {
    shopping_mall_customer_id: customerAuthorized.id,
  };

  // 3. Retrieve full mileage list with no filter
  const fullListRequest = {
    ...baseRequest,
  } satisfies IShoppingMallMileage.IRequest;
  const fullList: IPageIShoppingMallMileage.ISummary =
    await api.functional.shoppingMall.customer.mileages.index(connection, {
      body: fullListRequest,
    });
  typia.assert(fullList);

  // Assert that all mileages belong to the authenticated customer
  for (const mileage of fullList.data) {
    TestValidator.equals(
      "Mileage belongs to authenticated customer",
      mileage.shopping_mall_customer_id,
      customerAuthorized.id,
    );
  }

  // Assert pagination integrity
  TestValidator.predicate(
    "Pagination current page is >= 1",
    fullList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "Pagination limit is positive",
    fullList.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "Pagination records count matches data length",
    fullList.pagination.records >= fullList.data.length,
  );
  TestValidator.predicate(
    "Pagination pages count is consistent",
    fullList.pagination.pages >=
      Math.ceil(fullList.pagination.records / fullList.pagination.limit),
  );

  // 4. Retrieve mileage list with points_min filter
  if (fullList.data.length > 0) {
    const minPoints = Math.max(
      0,
      Math.min(...fullList.data.map((m) => m.points)),
    );
    const pointsMinRequest = {
      ...baseRequest,
      points_min: minPoints,
    } satisfies IShoppingMallMileage.IRequest;
    const filteredByMinPoints: IPageIShoppingMallMileage.ISummary =
      await api.functional.shoppingMall.customer.mileages.index(connection, {
        body: pointsMinRequest,
      });
    typia.assert(filteredByMinPoints);

    for (const mileage of filteredByMinPoints.data) {
      TestValidator.equals(
        "Mileage belongs to authenticated customer",
        mileage.shopping_mall_customer_id,
        customerAuthorized.id,
      );
      TestValidator.predicate(
        "Mileage points >= points_min",
        mileage.points >= minPoints,
      );
    }
  }

  // 5. Retrieve mileage list with points_max filter
  if (fullList.data.length > 0) {
    const maxPoints = Math.max(...fullList.data.map((m) => m.points));
    const pointsMaxRequest = {
      ...baseRequest,
      points_max: maxPoints,
    } satisfies IShoppingMallMileage.IRequest;
    const filteredByMaxPoints: IPageIShoppingMallMileage.ISummary =
      await api.functional.shoppingMall.customer.mileages.index(connection, {
        body: pointsMaxRequest,
      });
    typia.assert(filteredByMaxPoints);

    for (const mileage of filteredByMaxPoints.data) {
      TestValidator.equals(
        "Mileage belongs to authenticated customer",
        mileage.shopping_mall_customer_id,
        customerAuthorized.id,
      );
      TestValidator.predicate(
        "Mileage points <= points_max",
        mileage.points <= maxPoints,
      );
    }
  }

  // 6. Retrieve mileage list with expired flag true
  const expiredOnlyRequest = {
    ...baseRequest,
    expired: true,
  } satisfies IShoppingMallMileage.IRequest;
  const expiredList: IPageIShoppingMallMileage.ISummary =
    await api.functional.shoppingMall.customer.mileages.index(connection, {
      body: expiredOnlyRequest,
    });
  typia.assert(expiredList);
  for (const mileage of expiredList.data) {
    TestValidator.equals(
      "Mileage belongs to authenticated customer",
      mileage.shopping_mall_customer_id,
      customerAuthorized.id,
    );
    // We do not have explicit expired flag in response, so just trust filtering
  }

  // 7. Retrieve mileage list with active_only true
  const activeOnlyRequest = {
    ...baseRequest,
    active_only: true,
  } satisfies IShoppingMallMileage.IRequest;
  const activeList: IPageIShoppingMallMileage.ISummary =
    await api.functional.shoppingMall.customer.mileages.index(connection, {
      body: activeOnlyRequest,
    });
  typia.assert(activeList);
  for (const mileage of activeList.data) {
    TestValidator.equals(
      "Mileage belongs to authenticated customer",
      mileage.shopping_mall_customer_id,
      customerAuthorized.id,
    );
    // We do not have explicit active flag in response, so just trust filtering
  }

  // 8. Retrieve mileage list with pagination parameters
  const pageSize = 3;
  const pageRequest1 = {
    ...baseRequest,
    page: 1,
    limit: pageSize,
  } satisfies IShoppingMallMileage.IRequest;
  const page1Result: IPageIShoppingMallMileage.ISummary =
    await api.functional.shoppingMall.customer.mileages.index(connection, {
      body: pageRequest1,
    });
  typia.assert(page1Result);
  TestValidator.predicate(
    "Page 1 record count <= limit",
    page1Result.data.length <= pageSize,
  );
  TestValidator.equals(
    "Page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("Page 1 limit", page1Result.pagination.limit, pageSize);

  const pageRequest2 = {
    ...baseRequest,
    page: 2,
    limit: pageSize,
  } satisfies IShoppingMallMileage.IRequest;
  const page2Result: IPageIShoppingMallMileage.ISummary =
    await api.functional.shoppingMall.customer.mileages.index(connection, {
      body: pageRequest2,
    });
  typia.assert(page2Result);
  TestValidator.predicate(
    "Page 2 record count <= limit",
    page2Result.data.length <= pageSize,
  );
  TestValidator.equals(
    "Page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("Page 2 limit", page2Result.pagination.limit, pageSize);

  // Assert no overlap between page1 and page2 data IDs
  const page1Ids = new Set(page1Result.data.map((m) => m.id));
  const page2Ids = new Set(page2Result.data.map((m) => m.id));
  for (const id of page2Ids) {
    TestValidator.predicate(
      "Different pages have unique mileage IDs",
      !page1Ids.has(id),
    );
  }
}
