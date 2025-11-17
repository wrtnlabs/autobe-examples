import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_shopping_mall_seller_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Seller user joins
  const sellerPassword = "1234";
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Admin user joins
  const adminPassword = "admin1234";
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://admin.example.com/join",
        referrer: "https://admin.referrer.com",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 3. Admin user logs in to ensure session
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://admin.example.com/login",
        referrer: "https://admin.referrer.com",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 4. Admin creates a new shopping mall seller with the same email as first seller joined
  const adminCreatedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.shoppingMallSellers.create(
      connection,
      {
        body: {
          email: sellerEmail,
          password: "1234",
        } satisfies IShoppingMallSeller.ICreate,
      },
    );
  typia.assert(adminCreatedSeller);

  // 5. Seller logs in to authenticate their own session
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.referrer.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 6. Seller deletes their own seller account
  await api.functional.shoppingMall.seller.shoppingMallSellers.erase(
    connection,
    {
      shoppingMallSellerId: seller.id,
    },
  );
}
