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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

/**
 * Test customer address list pagination and sorting functionality.
 *
 * Validates the complete address listing workflow including pagination parameters, sorting options, and metadata accuracy. Ensures that addresses are correctly paginated with proper metadata, sorted by various fields (created_at, updated_at, is_default), and that empty results are handled correctly.
 *
 * Special attention is given to verifying pagination metadata calculations, sorting order correctness, and proper handling of edge cases like empty result sets and boundary conditions.
 *
 * 1. Customer registers and authenticates to access private address data.
 * 2. Multiple addresses are created with varying timestamps.
 * 3. Pagination is tested with different page and limit values.
 * 4. Sorting by created_at validates chronological ordering.
 * 5. Sorting by updated_at validates modification time ordering.
 * 6. Sorting by is_default validates ordering (all addresses have is_default=false by default).
 * 7. Pagination metadata (current, limit, records, pages) is verified.
 * 8. Empty results are tested with non-matching search criteria.
 */
export async function test_api_customer_address_list_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Create multiple addresses for testing pagination and sorting
  const addresses: IShoppingMallCustomerAddress[] = [];
  for (let i = 0; i < 5; i++) {
    const address =
      await generate_random_shopping_mall_customer_addresses_create(
        customerConnection,
        {
          body: {},
        },
      );
    typia.assert(address);
    addresses.push(address);
  }
  // 3. Test basic pagination with default parameters
  const page1 = await api.functional.shoppingMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 10);
  TestValidator.equals("pagination records", page1.pagination.records, 5);
  TestValidator.equals("pagination pages", page1.pagination.pages, 1);
  TestValidator.equals("data count", page1.data.length, 5);
  // 4. Test pagination with limit = 2
  const page2 = await api.functional.shoppingMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page 1 pagination current",
    page2.pagination.current,
    1,
  );
  TestValidator.equals("page 1 pagination limit", page2.pagination.limit, 2);
  TestValidator.equals(
    "page 1 pagination records",
    page2.pagination.records,
    5,
  );
  TestValidator.equals("page 1 pagination pages", page2.pagination.pages, 3);
  TestValidator.equals("page 1 data count", page2.data.length, 2);
  // 5. Test page 2 with limit = 2
  const page3 = await api.functional.shoppingMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals(
    "page 2 pagination current",
    page3.pagination.current,
    2,
  );
  TestValidator.equals("page 2 pagination limit", page3.pagination.limit, 2);
  TestValidator.equals(
    "page 2 pagination records",
    page3.pagination.records,
    5,
  );
  TestValidator.equals("page 2 pagination pages", page3.pagination.pages, 3);
  TestValidator.equals("page 2 data count", page3.data.length, 2);
  // 6. Test sorting by created_at ascending
  const sortedByCreatedAtAsc =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(sortedByCreatedAtAsc);
  // Verify ascending order (oldest first)
  for (let i = 1; i < sortedByCreatedAtAsc.data.length; i++) {
    TestValidator.predicate(
      `created_at ascending order at index ${i}`,
      new Date(sortedByCreatedAtAsc.data[i - 1].created_at).getTime() <=
        new Date(sortedByCreatedAtAsc.data[i].created_at).getTime(),
    );
  }
  // 7. Test sorting by created_at descending
  const sortedByCreatedAtDesc =
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
  typia.assert(sortedByCreatedAtDesc);
  // Verify descending order (newest first)
  for (let i = 1; i < sortedByCreatedAtDesc.data.length; i++) {
    TestValidator.predicate(
      `created_at descending order at index ${i}`,
      new Date(sortedByCreatedAtDesc.data[i - 1].created_at).getTime() >=
        new Date(sortedByCreatedAtDesc.data[i].created_at).getTime(),
    );
  }
  // 8. Test sorting by updated_at ascending
  const sortedByUpdatedAtAsc =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "updated_at",
          sortOrder: "asc",
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(sortedByUpdatedAtAsc);
  // Verify ascending order
  for (let i = 1; i < sortedByUpdatedAtAsc.data.length; i++) {
    TestValidator.predicate(
      `updated_at ascending order at index ${i}`,
      new Date(sortedByUpdatedAtAsc.data[i - 1].updated_at).getTime() <=
        new Date(sortedByUpdatedAtAsc.data[i].updated_at).getTime(),
    );
  }
  // 9. Test sorting by updated_at descending
  const sortedByUpdatedAtDesc =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "updated_at",
          sortOrder: "desc",
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(sortedByUpdatedAtDesc);
  // Verify descending order
  for (let i = 1; i < sortedByUpdatedAtDesc.data.length; i++) {
    TestValidator.predicate(
      `updated_at descending order at index ${i}`,
      new Date(sortedByUpdatedAtDesc.data[i - 1].updated_at).getTime() >=
        new Date(sortedByUpdatedAtDesc.data[i].updated_at).getTime(),
    );
  }
  // 10. Test sorting by is_default descending (all addresses have is_default=false)
  const sortedByIsDefaultDesc =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "is_default",
          sortOrder: "desc",
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(sortedByIsDefaultDesc);
  // Verify all addresses have is_default=false (default value)
  for (const address of sortedByIsDefaultDesc.data) {
    TestValidator.predicate(
      "all addresses have is_default=false by default",
      address.is_default === false,
    );
  }
  // 11. Test sorting by is_default ascending
  const sortedByIsDefaultAsc =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "is_default",
          sortOrder: "asc",
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(sortedByIsDefaultAsc);
  // Verify all addresses have is_default=false
  for (const address of sortedByIsDefaultAsc.data) {
    TestValidator.predicate(
      "all addresses have is_default=false by default",
      address.is_default === false,
    );
  }
  // 12. Test empty results with non-matching search
  const emptyResults =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "NonExistentRecipientName12345",
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals(
    "empty results pagination records",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results pagination pages",
    emptyResults.pagination.pages,
    0,
  );
  TestValidator.equals("empty results data count", emptyResults.data.length, 0);
  // 13. Test filtering by is_default = true (should return 0 results since all are false)
  const defaultOnly =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          isDefault: true,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(defaultOnly);
  TestValidator.equals(
    "default only records count",
    defaultOnly.pagination.records,
    0,
  );
  TestValidator.equals("default only data count", defaultOnly.data.length, 0);
  // 14. Test filtering by is_default = false (should return all 5 addresses)
  const nonDefaultOnly =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          isDefault: false,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(nonDefaultOnly);
  TestValidator.equals(
    "non-default only records count",
    nonDefaultOnly.pagination.records,
    5,
  );
  TestValidator.equals(
    "non-default only data count",
    nonDefaultOnly.data.length,
    5,
  );
  for (const address of nonDefaultOnly.data) {
    TestValidator.predicate(
      "non-default address is not default",
      address.is_default === false,
    );
  }
}
