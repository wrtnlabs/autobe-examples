import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformShoppingCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verifies that an authenticated customer with an empty cart receives a properly structured paginated response.
 *
 * Tests the cart items listing endpoint for a newly registered customer who has not added any items to their shopping cart. The test validates that the API gracefully handles this empty state by returning a valid paginated structure with zero records, zero pages, default page 1, and a valid limit value.
 *
 * 1. Creates a new customer account via registration.
 * 2. Calls the cart items listing endpoint with no filter parameters.
 * 3. Asserts that the response pagination metadata shows 0 records and 0 pages.
 * 4. Confirms the data array is empty.
 */
export async function test_api_cart_empty_listing_for_authenticated_customer(
  connection: api.IConnection,
) {
  // 1. Authenticate a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  // 2. Call cart items listing with no filter parameters
  const response =
    await api.functional.ecommercePlatform.customer.cart_items.index(
      customerConnection,
      {
        body: {} satisfies IEcommercePlatformShoppingCartItem.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination for empty cart state
  TestValidator.equals("pagination records", response.pagination.records, 0);
  TestValidator.equals("pagination pages", response.pagination.pages, 0);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit > 0,
  );
  TestValidator.equals("data array is empty", response.data.length, 0);
}
