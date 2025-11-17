import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

export async function test_api_shopping_mall_customer_shoppingmallwishlists_create_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer signs up
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const href = `https://www.testsite.com/${RandomGenerator.alphabets(10)}`;
  const referrer = `https://www.google.com/search?q=${RandomGenerator.alphabets(5)}`;
  const joinRequestBody = {
    email: customerEmail,
    password: "testPassword123!",
    href,
    referrer,
  } satisfies IShoppingMallCustomer.ICreate;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(customerAuthorized);

  // 2. Create a new wishlist
  const wishlistName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const wishlistCreateRequestBody = {
    name: wishlistName,
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.shoppingMallWishlists.create(
      connection,
      {
        body: wishlistCreateRequestBody,
      },
    );
  typia.assert(wishlist);

  // 3. Validate wishlist creation
  TestValidator.predicate(
    "wishlist id exists",
    typeof wishlist.id === "string" && wishlist.id.length > 0,
  );
  TestValidator.equals(
    "wishlist shopping_mall_customer_id matches authorized customer id",
    wishlist.shopping_mall_customer_id,
    customerAuthorized.id,
  );
  TestValidator.predicate(
    "wishlist created_at is ISO date string",
    typeof wishlist.created_at === "string" &&
      !Number.isNaN(Date.parse(wishlist.created_at)),
  );
  TestValidator.predicate(
    "wishlist updated_at is ISO date string",
    typeof wishlist.updated_at === "string" &&
      !Number.isNaN(Date.parse(wishlist.updated_at)),
  );
  TestValidator.equals(
    "wishlist deleted_at is null or undefined",
    wishlist.deleted_at,
    null,
  );
}
