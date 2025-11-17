import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_shopping_mall_admin_shopping_mall_sellers_retrieve_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorization token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "1234",
        ip: null,
        href: "https://testing.example.com/join",
        referrer: "https://referrer.example.com/",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin creates a shopping mall seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.shoppingMallSellers.create(
      connection,
      {
        body: {
          email: sellerEmail,
          password: "1234",
        } satisfies IShoppingMallSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Admin retrieves the created shopping mall seller by ID
  const retrievedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.shoppingMallSellers.at(connection, {
      shoppingMallSellerId: seller.id,
    });
  typia.assert(retrievedSeller);

  // 4. Validate retrieved seller data
  TestValidator.equals("seller id matches", retrievedSeller.id, seller.id);
  TestValidator.equals(
    "seller email matches",
    retrievedSeller.email,
    seller.email,
  );
}
