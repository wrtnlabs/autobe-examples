import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Retrieve wishlist items for an authenticated customer with empty wishlist.
 *
 * Test Steps:
 * 1. Register and authenticate a new customer using POST /ecommerceMall/auth/customer/join
 * 2. Ensure the customer has no wishlist items (new account has empty wishlist by default)
 * 3. Call PATCH /ecommerceMall/customer/wishlist with default pagination parameters
 * 4. Verify the response contains pagination metadata with current: 1, records: 0, pages: 0 and empty data array
 * 5. Test with custom pagination parameters (page: 2, limit: 5) and verify empty result with correct pagination metadata
 *
 * Expected Behavior:
 * - Response returns HTTP 200 with empty data array
 * - Pagination metadata correctly shows 0 records and 0 pages
 * - No authentication errors or forbidden responses for valid customer
 * - Empty wishlist does not trigger 404 or other error status
 */
export async function test_api_customer_wishlist_retrieve_empty(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for customer
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Register and authenticate a new customer
  await authorize_customer_join(customerConnection, {});
  // 2. Test with default pagination parameters (empty body)
  const defaultResponse =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultResponse);
  // 3. Verify pagination metadata for empty wishlist
  TestValidator.equals(
    "default pagination current",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination records",
    defaultResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "default pagination pages",
    defaultResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "default data array length",
    defaultResponse.data.length,
    0,
  );
  // 4. Test with custom pagination parameters (page: 2, limit: 5)
  const customResponse =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 5,
        },
      },
    );
  typia.assert(customResponse);
  // 5. Verify empty result with correct pagination metadata
  TestValidator.equals(
    "custom pagination current",
    customResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom pagination limit",
    customResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "custom pagination records",
    customResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "custom pagination pages",
    customResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "custom data array length",
    customResponse.data.length,
    0,
  );
}
