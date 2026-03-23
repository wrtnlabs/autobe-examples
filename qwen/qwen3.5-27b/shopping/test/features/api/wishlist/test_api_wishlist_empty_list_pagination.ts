import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that customers with no wishlist items receive a valid empty paginated response.
 *
 * This test verifies that the wishlist endpoint handles empty states correctly:
 * 1. Register a new customer without adding any wishlist items
 * 2. Query the wishlist with default pagination parameters
 * 3. Verify empty response structure with correct pagination metadata
 * 4. Test with custom pagination parameters to ensure flexibility
 */
export async function test_api_wishlist_empty_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Query wishlist with default pagination (should be empty)
  const defaultResponse =
    await api.functional.shoppingMall.customer.wishlist.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // 3. Validate default empty response structure
  TestValidator.equals("data array is empty", defaultResponse.data.length, 0);
  TestValidator.equals(
    "current page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "records count is 0",
    defaultResponse.pagination.records,
    0,
  );
  TestValidator.equals("pages count is 0", defaultResponse.pagination.pages, 0);
  TestValidator.predicate(
    "limit is positive",
    defaultResponse.pagination.limit > 0,
  );
  // 4. Test with custom pagination parameters
  const customResponse =
    await api.functional.shoppingMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(customResponse);
  // 5. Validate custom pagination response structure
  TestValidator.equals(
    "custom data array is empty",
    customResponse.data.length,
    0,
  );
  TestValidator.equals(
    "custom current page is 1",
    customResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom records count is 0",
    customResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "custom pages count is 0",
    customResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "custom limit is 50",
    customResponse.pagination.limit,
    50,
  );
}
