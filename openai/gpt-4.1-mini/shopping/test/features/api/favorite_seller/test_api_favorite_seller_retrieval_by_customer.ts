import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_favorite_seller_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins (registers) via /auth/customer/join
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "validPassword123",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Admin joins to create seller
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: "AdminPass123",
        phone_number: null,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 3. Admin login for authorization
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123",
      ip: null,
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 4. Admin creates a seller
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerPass123",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 5. Customer login (to ensure customer connection is authenticated)
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "validPassword123",
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 6. Customer creates a favorite seller record linking the customer to the seller
  const favoriteSellerCreateBody = {
    seller_id: seller.id,
  } satisfies IShoppingMallFavoriteSeller.ICreate;

  const favoriteSellerRecord: IShoppingMallFavoriteSeller =
    await api.functional.shoppingMall.customer.shoppingMall.favoriteSellers.create(
      connection,
      {
        body: favoriteSellerCreateBody,
      },
    );
  typia.assert(favoriteSellerRecord);

  TestValidator.equals(
    "favorite seller customer id matches",
    favoriteSellerRecord.customerId,
    customer.id,
  );

  TestValidator.equals(
    "favorite seller seller id matches",
    favoriteSellerRecord.sellerId,
    seller.id,
  );

  // 7. Retrieve the favorite seller record by id
  const retrievedFavoriteSeller: IShoppingMallFavoriteSeller =
    await api.functional.shoppingMall.customer.shoppingMall.favoriteSellers.at(
      connection,
      {
        favoriteSellerId: favoriteSellerRecord.id,
      },
    );
  typia.assert(retrievedFavoriteSeller);

  // Validate the retrieved record matches the created one
  TestValidator.equals(
    "retrieved favorite seller id matches created",
    retrievedFavoriteSeller.id,
    favoriteSellerRecord.id,
  );

  TestValidator.equals(
    "retrieved favorite seller customer id matches created",
    retrievedFavoriteSeller.customerId,
    favoriteSellerRecord.customerId,
  );

  TestValidator.equals(
    "retrieved favorite seller seller id matches created",
    retrievedFavoriteSeller.sellerId,
    favoriteSellerRecord.sellerId,
  );

  // Validate nested customer and seller summaries if present
  if (retrievedFavoriteSeller.customer !== undefined) {
    TestValidator.equals(
      "customer summary id matches",
      retrievedFavoriteSeller.customer.id,
      customer.id,
    );
  }

  if (retrievedFavoriteSeller.seller !== undefined) {
    TestValidator.equals(
      "seller summary id matches",
      retrievedFavoriteSeller.seller.id,
      seller.id,
    );
  }
}
