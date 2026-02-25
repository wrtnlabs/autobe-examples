import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test the basic order search functionality for authenticated customers.
 * Verify that customers can retrieve their own orders with default pagination settings.
 * Validate that the response includes essential order information such as order ID,
 * creation timestamp, and customer details. Ensure that only the authenticated
 * customer's orders are returned and that orders from other customers are excluded.
 * Check that pagination metadata is correctly calculated including current page,
 * limit, total records, and total pages.
 */
export async function test_api_customer_order_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 4,
      }).substring(0, 50),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);
  // Perform order search with default pagination
  const searchResults: IPageIEcommerceOrder.ISummary =
    await api.functional.ecommerce.customer.orders.index(customerConnection, {
      body: {
        // Empty body to use default pagination (page: 1, limit: default)
      } satisfies IEcommerceOrder.IRequest,
    });
  typia.assert(searchResults);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination structure exists",
    typeof searchResults.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is positive",
    searchResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    searchResults.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchResults.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.equals(
    "data is an array",
    Array.isArray(searchResults.data),
    true,
  );
  // Validate each order in the response
  for (const order of searchResults.data) {
    typia.assert(order);
    // Validate order properties
    TestValidator.predicate(
      "order has valid UUID ID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        order.id,
      ),
    );
    TestValidator.predicate(
      "created_at is ISO date-time format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        order.created_at,
      ),
    );
    TestValidator.predicate(
      "updated_at is ISO date-time format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        order.updated_at,
      ),
    );
    // Validate customer information
    typia.assert(order.customer);
    TestValidator.predicate(
      "customer has valid UUID ID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        order.customer.id,
      ),
    );
    TestValidator.predicate(
      "customer email is valid format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.customer.email),
    );
    TestValidator.predicate(
      "customer display_name is not empty",
      order.customer.display_name.length > 0,
    );
    TestValidator.predicate(
      "customer created_at is ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        order.customer.created_at,
      ),
    );
  }
  // Validate pagination calculations
  if (searchResults.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculation is correct",
      searchResults.pagination.pages ===
        Math.ceil(
          searchResults.pagination.records / searchResults.pagination.limit,
        ),
    );
  } else {
    TestValidator.equals(
      "zero records means zero pages",
      searchResults.pagination.pages,
      0,
    );
  }
}
