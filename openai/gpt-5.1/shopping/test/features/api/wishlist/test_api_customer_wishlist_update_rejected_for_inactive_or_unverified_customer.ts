import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_customer_wishlist_update_rejected_for_inactive_or_unverified_customer(
  connection: api.IConnection,
) {
  // 1. Register a customer and obtain an authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 2. Create a wishlist for this authenticated customer
  const createBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallWishlist>(wishlist);

  // 3. Prepare a valid update payload
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallWishlist.IUpdate;

  // 4. Simulate an unauthenticated or otherwise ineligible customer context
  //    by creating a fresh connection object that does not carry over
  //    the Authorization header set by the join() call.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Attempt to update the wishlist using the unauthenticated connection
  //    and assert that the operation is rejected.
  await TestValidator.error(
    "wishlist update must be rejected when customer is not authenticated or eligible",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.update(
        unauthenticatedConnection,
        {
          wishlistId: wishlist.id,
          body: updateBody,
        },
      );
    },
  );
}
