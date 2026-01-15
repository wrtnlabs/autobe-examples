import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingMethod";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
export async function test_api_shipping_method_sort_by_cost_ascending(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for admin to make API calls
  const adminConnection: api.IConnection = { host: connection.host };
  // First, get ALL active shipping methods to establish expected sorted order
  // Use max limit to get as many as possible
  const getAllResponse =
    await api.functional.shoppingMall.shipping_methods.index(adminConnection, {
      body: {
        page: 1,
        limit: 100,
        is_active: true,
        sort_by: "cost", // This will be ignored because we're getting all data
        order: "asc",
      } satisfies IShoppingMallShippingMethod.IRequest,
    });
  typia.assert(getAllResponse);
  // Filter and sort manually: only active methods, sorted by base_cost ascending
  const allActiveMethods = getAllResponse.data.filter(
    (method) => method.is_active,
  );
  const expectedSorted = [...allActiveMethods].sort(
    (a, b) => a.base_cost - b.base_cost,
  );
  // Validate that the API sorts correctly when we request with sort_by=cost and order=asc
  const response = await api.functional.shoppingMall.shipping_methods.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: Math.min(100, expectedSorted.length),
        sort_by: "cost",
        order: "asc",
      } satisfies IShoppingMallShippingMethod.IRequest,
    },
  );
  typia.assert(response);
  // Verify pagination
  TestValidator.equals(
    "pagination records matches expected count",
    response.pagination.records,
    expectedSorted.length,
  );
  TestValidator.equals(
    "pagination limit matches requested",
    response.pagination.limit,
    Math.min(100, expectedSorted.length),
  );
  TestValidator.equals(
    "pagination current is 1",
    response.pagination.current,
    1,
  );
  // Verify number of returned items
  TestValidator.equals(
    "response data length matches pagination",
    response.data.length,
    response.pagination.records,
  );
  // Verify the sort order is correct
  for (let i = 0; i < response.data.length; i++) {
    TestValidator.equals(
      `method ${i} base cost in ascending order`,
      response.data[i].base_cost,
      expectedSorted[i].base_cost,
    );
  }
  // Verify inactive methods are excluded from results
  for (const method of response.data) {
    TestValidator.predicate("method is active", method.is_active);
  }
  // Test pagination: if there are more than 10 methods, test second page
  if (expectedSorted.length > 10) {
    const secondPageResponse =
      await api.functional.shoppingMall.shipping_methods.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 10,
            sort_by: "cost",
            order: "asc",
          } satisfies IShoppingMallShippingMethod.IRequest,
        },
      );
    typia.assert(secondPageResponse);
    const expectedSecondPageLength = Math.min(10, expectedSorted.length - 10);
    TestValidator.equals(
      "second page has 10 items or remaining",
      secondPageResponse.data.length,
      expectedSecondPageLength,
    );
    // Verify continuation of sorted order
    for (let i = 0; i < secondPageResponse.data.length; i++) {
      TestValidator.equals(
        `second page method ${i} base cost`,
        secondPageResponse.data[i].base_cost,
        expectedSorted[i + 10].base_cost,
      );
    }
  }
  // Test that default sort_by is cost (when not provided)
  const defaultSortResponse =
    await api.functional.shoppingMall.shipping_methods.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
        order: "asc",
      } satisfies IShoppingMallShippingMethod.IRequest,
    });
  typia.assert(defaultSortResponse);
  // Verify default sort returns the same results as explicit sort_by=cost
  TestValidator.equals(
    "default sort matches explicit cost sort",
    defaultSortResponse.data.length,
    response.data.length,
  );
  for (let i = 0; i < Math.min(10, response.data.length); i++) {
    TestValidator.equals(
      `default sort method ${i} base cost`,
      defaultSortResponse.data[i].base_cost,
      response.data[i].base_cost,
    );
  }
  // Test that default order is asc (when not provided with sort_by)
  const defaultOrderResponse =
    await api.functional.shoppingMall.shipping_methods.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "cost",
      } satisfies IShoppingMallShippingMethod.IRequest,
    });
  typia.assert(defaultOrderResponse);
  // Verify default order is asc
  TestValidator.equals(
    "default order matches explicit asc",
    defaultOrderResponse.data.length,
    response.data.length,
  );
  for (let i = 0; i < Math.min(10, response.data.length); i++) {
    TestValidator.equals(
      `default order method ${i} base cost`,
      defaultOrderResponse.data[i].base_cost,
      response.data[i].base_cost,
    );
  }
  // Test that sort_order (deprecated) is ignored when sort_by and order are used
  const sortOrderResponse =
    await api.functional.shoppingMall.shipping_methods.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "cost",
        order: "asc",
        sort_order: "desc", // This should be ignored
      } satisfies IShoppingMallShippingMethod.IRequest,
    });
  typia.assert(sortOrderResponse);
  // Verify order still respects 'order' parameter, not sort_order
  TestValidator.equals(
    "sort_order ignored",
    sortOrderResponse.data.length,
    response.data.length,
  );
  for (let i = 0; i < Math.min(10, response.data.length); i++) {
    TestValidator.equals(
      "sort_order ignored, order takes precedence",
      sortOrderResponse.data[i].base_cost,
      response.data[i].base_cost,
    );
  }
  // Test descending order
  const descResponse = await api.functional.shoppingMall.shipping_methods.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "cost",
        order: "desc",
      } satisfies IShoppingMallShippingMethod.IRequest,
    },
  );
  typia.assert(descResponse);
  // Verify descending order is reverse of ascending
  const expectedDesc = [...expectedSorted].reverse();
  for (let i = 0; i < Math.min(10, expectedSorted.length); i++) {
    TestValidator.equals(
      `descending method ${i} base cost`,
      descResponse.data[i].base_cost,
      expectedDesc[i].base_cost,
    );
  }
}