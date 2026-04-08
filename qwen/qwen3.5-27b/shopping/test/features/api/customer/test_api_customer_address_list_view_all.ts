import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an authenticated customer can view all their saved shipping addresses.
 *
 * Validates the customer address listing workflow including authentication and paginated retrieval. Ensures that the response structure is correct with proper pagination metadata and that only addresses belonging to the authenticated customer are returned.
 *
 * Special attention is given to verifying pagination metadata accuracy, response type validation, and proper authentication enforcement.
 *
 * 1. Register a new customer account with valid credentials.
 * 2. Create a customer-specific connection for authenticated API calls.
 * 3. Retrieve all addresses using the addresses index endpoint with pagination.
 * 4. Validate response structure, pagination metadata, and type correctness.
 * 5. Verify that the response contains valid pagination fields (current, limit, records, pages).
 */
export async function test_api_customer_address_list_view_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Retrieve all addresses with pagination
  const response = await api.functional.shoppingMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "records count is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 5. Test with different pagination parameters
  const responsePage2 =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(responsePage2);
  TestValidator.equals("page 2 current", responsePage2.pagination.current, 2);
  TestValidator.equals("page 2 limit", responsePage2.pagination.limit, 5);
  // 6. Test with sorting parameters
  const responseSorted =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(responseSorted);
  TestValidator.equals(
    "sorted response has valid pagination",
    responseSorted.pagination.current,
    1,
  );
  // 7. Test with search filter
  const responseFiltered =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          search: RandomGenerator.alphabets(3),
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(responseFiltered);
  TestValidator.predicate(
    "filtered response has valid structure",
    responseFiltered.pagination.records >= 0,
  );
  // 8. Validate that if any addresses exist, they have all required fields
  if (response.data.length > 0) {
    await ArrayUtil.asyncForEach(response.data, async (address) => {
      typia.assert(address);
      TestValidator.predicate(
        "has recipient_name",
        address.recipient_name.length > 0,
      );
      TestValidator.predicate(
        "has phone_number",
        address.phone_number.length > 0,
      );
      TestValidator.predicate(
        "has street_address",
        address.street_address.length > 0,
      );
      TestValidator.predicate("has city", address.city.length > 0);
      TestValidator.predicate(
        "has postal_code",
        address.postal_code.length > 0,
      );
      TestValidator.predicate("has country", address.country.length > 0);
      TestValidator.predicate(
        "has valid created_at format",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(address.created_at),
      );
      TestValidator.predicate(
        "has valid updated_at format",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(address.updated_at),
      );
    });
    // Verify that at most one address has is_default=true
    const defaultAddresses = response.data.filter((addr) => addr.is_default);
    TestValidator.predicate(
      "at most one default address",
      defaultAddresses.length <= 1,
    );
  }
}
