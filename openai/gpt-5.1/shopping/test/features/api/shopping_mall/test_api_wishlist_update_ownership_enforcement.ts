import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

export async function test_api_wishlist_update_ownership_enforcement(
  connection: api.IConnection,
) {
  // 1. Register customer A (owner of the wishlist)
  const customerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerA);

  // 2. Customer A creates a wishlist
  const createWishlistBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlistA: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createWishlistBody,
    });
  typia.assert<IShoppingMallWishlist>(wishlistA);

  // Assert ownership link between wishlist and customer A
  TestValidator.equals(
    "wishlist owner id should match customer A id",
    wishlistA.customer.id,
    customerA.id,
  );
  TestValidator.equals(
    "wishlist owner email should match customer A email",
    wishlistA.customer.email,
    customerA.email,
  );

  // 3. Register customer B (another customer)
  const customerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerB);

  // Sanity: customer B must be different from customer A
  TestValidator.notEquals(
    "customer B id should differ from customer A id",
    customerB.id,
    customerA.id,
  );

  // 4. Attempt to update customer A's wishlist using customer B's session
  const unauthorizedUpdateBody = {
    name: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_default: false,
    status: "archived",
  } satisfies IShoppingMallWishlist.IUpdate;

  await TestValidator.error(
    "customer B cannot update another customer's wishlist",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.update(connection, {
        wishlistId: wishlistA.id,
        body: unauthorizedUpdateBody,
      });
    },
  );

  // Note: We cannot re-authenticate as customer A because no login endpoint is
  // provided, and join would attempt to create a new account. Therefore we
  // validate ownership enforcement purely by ensuring that another authenticated
  // customer cannot successfully update A's wishlist and cannot get any
  // IShoppingMallWishlist response from the update endpoint.
}
