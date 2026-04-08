import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer views empty wishlist immediately after registration.
 *
 * Validates that a newly registered customer's wishlist is empty and returns proper pagination metadata with zero records. This ensures the wishlist system correctly initializes for new customers and handles empty state scenarios appropriately.
 *
 * The test verifies the pagination metadata contains correct values for an empty result set: current page is 1, records count is 0, and pages count is 0. The data array should be empty with no wishlist items.
 *
 * 1. Register a new customer account with random credentials.
 * 2. Create customer-specific connection for authenticated requests.
 * 3. Request wishlist with default pagination parameters.
 * 4. Validate response contains empty data array.
 * 5. Validate pagination metadata shows 0 records and 0 pages.
 */
export async function test_api_customer_wishlist_view_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. View empty wishlist
  const wishlist = await api.functional.ecommerce.customer.wishlist.index(
    customerConnection,
    {
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IEcommerceWishlistItem.IRequest,
    },
  );
  typia.assert(wishlist);
  // 3. Validate empty state
  TestValidator.equals("wishlist data is empty", wishlist.data.length, 0);
  TestValidator.equals(
    "pagination current page",
    wishlist.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    wishlist.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages count", wishlist.pagination.pages, 0);
}
