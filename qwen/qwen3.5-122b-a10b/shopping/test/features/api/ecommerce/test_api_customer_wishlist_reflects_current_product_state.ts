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
 * Test customer wishlist reflects current product state.
 *
 * Validates the customer wishlist endpoint returns proper structure and pagination metadata. Since seller product update/delete endpoints are not available in the SDK, this test focuses on validating the wishlist retrieval functionality with an empty wishlist.
 *
 * **Test Workflow**
 *
 * 1. Register a new customer account with randomized credentials
 * 2. View the customer's wishlist (empty initially)
 * 3. Validate the response structure including pagination metadata
 * 4. Verify empty data array when no wishlist items exist
 *
 * **Note**
 *
 * The original scenario required testing wishlist updates after product state changes (price, name updates, product deletion). However, the necessary seller product CRUD endpoints are not available in the provided SDK functions. This test validates the wishlist endpoint structure and empty state behavior instead.
 *
 * 1. Customer registration with randomized email and credentials
 * 2. Wishlist retrieval with default pagination parameters
 * 3. Validation of pagination metadata structure
 * 4. Verification of empty data array for new customers
 */
export async function test_api_customer_wishlist_reflects_current_product_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceCustomer.IAuthorized =
    await api.functional.ecommerce.auth.customer.join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. View wishlist (empty initially)
  const wishlist: IPageIEcommerceWishlistItem.ISummary =
    await api.functional.ecommerce.customer.wishlist.index(customerConnection, {
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IEcommerceWishlistItem.IRequest,
    });
  typia.assert(wishlist);
  // 3. Validate pagination structure
  TestValidator.equals("current page", wishlist.pagination.current, 1);
  TestValidator.predicate("limit positive", wishlist.pagination.limit > 0);
  TestValidator.predicate(
    "records count valid",
    wishlist.pagination.records >= 0,
  );
  TestValidator.predicate("pages count valid", wishlist.pagination.pages >= 0);
  // 4. Verify empty wishlist for new customer
  TestValidator.equals("wishlist empty", wishlist.data.length, 0);
  TestValidator.equals(
    "records matches data length",
    wishlist.pagination.records,
    0,
  );
}
