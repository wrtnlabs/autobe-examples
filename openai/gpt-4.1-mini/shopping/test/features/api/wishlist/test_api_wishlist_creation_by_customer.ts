import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_wishlist_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer signs up via join
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "passwd1234",
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create wishlist
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection);
  typia.assert(wishlist);

  // 3. Basic validations
  TestValidator.predicate(
    "wishlist id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      wishlist.id,
    ),
  );

  TestValidator.equals(
    "wishlist customer matches authenticated customer",
    wishlist.shopping_mall_customer_id,
    customer.id,
  );

  TestValidator.predicate(
    "wishlist customer session id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      wishlist.shopping_mall_customer_session_id,
    ),
  );

  TestValidator.predicate(
    "wishlist created_at is valid date-time",
    !isNaN(Date.parse(wishlist.created_at)),
  );

  TestValidator.predicate(
    "wishlist updated_at is valid date-time",
    !isNaN(Date.parse(wishlist.updated_at)),
  );

  TestValidator.predicate(
    "wishlist deleted_at is null or undefined",
    wishlist.deleted_at === null || wishlist.deleted_at === undefined,
  );

  // 4. If wishlist items exist, validate their structure
  if (wishlist.shopping_mall_wishlist_items !== undefined) {
    for (const item of wishlist.shopping_mall_wishlist_items) {
      typia.assert(item);
      TestValidator.predicate(
        "wishlist item id is UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          item.id,
        ),
      );

      TestValidator.equals(
        "wishlist item parent wishlist id matches wishlist id",
        item.shopping_mall_wishlist_id,
        wishlist.id,
      );

      TestValidator.predicate(
        "wishlist item SKU id is UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          item.shopping_mall_product_sku_id,
        ),
      );

      TestValidator.predicate(
        "wishlist item quantity is positive integer",
        Number.isInteger(item.quantity) && item.quantity > 0,
      );

      TestValidator.predicate(
        "wishlist item created_at is valid date-time",
        !isNaN(Date.parse(item.created_at)),
      );

      TestValidator.predicate(
        "wishlist item updated_at is valid date-time",
        !isNaN(Date.parse(item.updated_at)),
      );

      TestValidator.predicate(
        "wishlist item deleted_at is null or undefined",
        item.deleted_at === null || item.deleted_at === undefined,
      );
    }
  }
}
