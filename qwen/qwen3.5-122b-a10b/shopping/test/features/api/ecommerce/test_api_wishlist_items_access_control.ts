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
 * Test wishlist items access control between different customers.
 *
 * Validates that customers cannot access other customers' private wishlist data, ensuring proper data isolation and privacy boundaries are enforced in the ecommerce platform.
 *
 * The test creates two separate customer accounts and verifies that attempting to access another customer's wishlist items results in an access denied error. This confirms that wishlist data is properly scoped to the authenticated customer and cannot be breached through ID enumeration or unauthorized access attempts.
 *
 * 1. Customer A registers and authenticates with the system.
 * 2. Customer B registers and authenticates with the system (separate session).
 * 3. Customer A attempts to access a non-existent or foreign wishlist ID.
 * 4. System validates ownership and rejects the request with 403 Forbidden.
 * 5. Confirms that wishlist privacy boundaries are properly enforced.
 */
export async function test_api_wishlist_items_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A authenticates
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Customer B authenticates
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerB);
  // 3. Customer A attempts to access Customer B's wishlist items
  // Use Customer B's ID as the wishlistId to test access control
  // The backend should reject this with 403 Forbidden since Customer A doesn't own this wishlist
  await TestValidator.httpError(
    "customer cannot access another customer's wishlist items",
    403,
    async () => {
      await api.functional.ecommerce.customer.wishlists.items.index(
        customerAConnection,
        {
          wishlistId: customerB.id,
          body: {} satisfies IEcommerceWishlistItem.IRequest,
        },
      );
    },
  );
  // 4. Verify that the customers have different IDs (sanity check)
  TestValidator.notEquals("customer IDs differ", customerA.id, customerB.id);
}
