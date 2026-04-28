import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an authenticated customer with no saved products receives an empty wishlist list.
 *
 * Validates the complete empty wishlist retrieval flow including customer authentication via join and wishlist retrieval with pagination metadata verification. Ensures that an authenticated customer who has not saved any products to their wishlist receives a successful response with an empty data array and zero pagination counts.
 *
 * Special attention is given to verifying that the empty wishlist response returns 200 OK status, confirming the API handles empty collections correctly. The pagination metadata must show records=0 and pages=0 to indicate no wishlist items exist for the customer.
 *
 * 1. Customer joins the platform with unique email and credentials.
 * 2. Customer retrieves their wishlist using PATCH endpoint with no filters.
 * 3. Validates that response data array is empty (length 0).
 * 4. Validates that pagination.records equals 0.
 * 5. Validates that pagination.pages equals 0.
 */
export async function test_api_wishlist_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  // 2. Customer retrieves their wishlist with no filters
  const response =
    await api.functional.ecommercePlatform.customer.wishlist.index(
      customerConnection,
      {
        body: {} satisfies IEcommercePlatformWishlistItem.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate data array is empty
  TestValidator.equals("data array is empty", response.data.length, 0);
  // 4. Validate pagination records is 0
  TestValidator.equals("pagination.recods", response.pagination.records, 0);
  // 5. Validate pagination pages is 0
  TestValidator.equals("pagination.pages", response.pagination.pages, 0);
}
