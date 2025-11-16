import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_favorite_seller_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration via auth.customer.join
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassw0rd!",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customerAuth);

  // 2. Customer login to establish session context
  const customerLoginBody = {
    email: customerCreateBody.email,
    password: customerCreateBody.password,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 3. Admin registration via auth.admin.join
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "StrongPassw0rd!",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuth);

  // 4. Admin login
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
    ip: null,
    href: "https://example.com/admin-login",
    referrer: "https://example.com",
  } satisfies IShoppingMallAdmin.ILogin;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 5. Create seller via admin session
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassw0rd!",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;

  const sellerCreated: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBody,
    });
  typia.assert(sellerCreated);

  // 6. Customer creates favorite seller entry
  const favoriteSellerCreateBody = {
    seller_id: sellerCreated.id,
  } satisfies IShoppingMallFavoriteSeller.ICreate;

  const favoriteSellerCreated: IShoppingMallFavoriteSeller =
    await api.functional.shoppingMall.customer.shoppingMall.favoriteSellers.create(
      connection,
      {
        body: favoriteSellerCreateBody,
      },
    );
  typia.assert(favoriteSellerCreated);

  // 7. Validate favorite seller links correct customer and seller
  TestValidator.equals(
    "favorite seller customerId matches authenticated customer",
    favoriteSellerCreated.customerId,
    customerAuth.id,
  );

  TestValidator.equals(
    "favorite seller sellerId matches created seller",
    favoriteSellerCreated.sellerId,
    sellerCreated.id,
  );
}
