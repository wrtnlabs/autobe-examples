import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

export async function test_api_shopping_mall_customer_wishlist_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer account
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPassword123!";
  const customerName = RandomGenerator.name();
  const customerIp = null;
  const customerHref = "https://shoppingmall.example.com/signup";
  const customerReferrer = "https://shoppingmall.example.com";

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        full_name: customerName,
        ip: customerIp,
        href: customerHref,
        referrer: customerReferrer,
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a new wishlist for the authenticated customer
  const wishlistName = `Wishlist by ${customerName}`;
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: wishlistName,
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(wishlist);

  // 3. Validate wishlist creation response
  TestValidator.predicate(
    "wishlist has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      wishlist.id,
    ),
  );
  TestValidator.equals(
    "wishlist customer_id matches registered customer",
    wishlist.customer_id,
    customer.id,
  );
  TestValidator.equals(
    "wishlist name matches input",
    wishlist.name,
    wishlistName,
  );
  TestValidator.equals("wishlist status is active", wishlist.status, "active");

  // deleted_at can be null or undefined
  TestValidator.predicate(
    "wishlist deleted_at is null or undefined",
    wishlist.deleted_at === null || wishlist.deleted_at === undefined,
  );

  // Validate created_at and updated_at are ISO date-time strings
  TestValidator.predicate(
    "wishlist created_at is valid ISO date-time",
    !isNaN(Date.parse(wishlist.created_at)),
  );
  TestValidator.predicate(
    "wishlist updated_at is valid ISO date-time",
    !isNaN(Date.parse(wishlist.updated_at)),
  );
}
