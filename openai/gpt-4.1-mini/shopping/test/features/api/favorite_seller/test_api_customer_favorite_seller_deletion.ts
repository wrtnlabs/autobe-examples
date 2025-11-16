import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Scenario: Customer's Favorite Seller Deletion
 *
 * 1. Customer joins the platform with a unique email, password, and full name.
 * 2. Admin joins the platform with email, password, and assigned role.
 * 3. Admin creates a seller account with unique email, password, and name.
 * 4. Customer logs in to familiarize with session context.
 * 5. Customer adds the seller to their favorite sellers list.
 * 6. Customer deletes the favorite seller relationship using the favorite seller's
 *    unique ID.
 * 7. Validate that deletion was successful by checking favorite seller is no
 *    longer in the list and cannot be fetched.
 * 8. Steps must include comprehensive authentication for role switching without
 *    manual header manipulation.
 * 9. Use typia.assert on all API responses to validate types strictly.
 * 10. Use TestValidator equality and error assertion utilities with descriptive
 *     titles for validations.
 */

export async function test_api_customer_favorite_seller_deletion(
  connection: api.IConnection,
) {
  // 1. Customer joins
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerCreateBody = {
    email: customerEmail,
    password: "customerPass123",
    full_name: RandomGenerator.name(),
    href: "https://client.app/signup",
    referrer: "https://client.app/landing",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerCreateBody,
  });
  typia.assert(customer);

  // 2. Admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "adminPass123",
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(admin);

  // 3. Admin logs in
  const adminLoginBody = {
    email: adminEmail,
    password: "adminPass123",
    ip: null,
    href: "https://admin.app/login",
    referrer: "https://admin.app/landing",
  } satisfies IShoppingMallAdmin.ILogin;
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // 4. Admin creates seller
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "sellerPass123",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;
  const seller = await api.functional.shoppingMall.admin.sellers.create(
    connection,
    { body: sellerCreateBody },
  );
  typia.assert(seller);

  // 5. Customer logs in
  const customerLoginBody = {
    email: customerEmail,
    password: "customerPass123",
    ip: null,
    href: "https://client.app/login",
    referrer: "https://client.app/landing",
  } satisfies IShoppingMallCustomer.ILogin;
  await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });

  // 6. Customer adds favorite seller
  const favoriteCreateBody = {
    seller_id: seller.id,
  } satisfies IShoppingMallFavoriteSeller.ICreate;
  const favorite =
    await api.functional.shoppingMall.customer.shoppingMall.favoriteSellers.create(
      connection,
      { body: favoriteCreateBody },
    );
  typia.assert(favorite);
  TestValidator.equals(
    "favorite seller customer ID matches logged-in customer",
    favorite.customerId,
    customer.id,
  );
  TestValidator.equals(
    "favorite seller seller ID matches created seller",
    favorite.sellerId,
    seller.id,
  );

  // 7. Customer deletes the favorite seller relationship
  await api.functional.shoppingMall.customer.shoppingMall.favoriteSellers.erase(
    connection,
    { id: favorite.id },
  );

  // 8. Attempt to delete again to ensure it's gone (expect error)
  await TestValidator.error(
    "deleting non-existent favorite seller fails",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMall.favoriteSellers.erase(
        connection,
        { id: favorite.id },
      );
    },
  );
}
