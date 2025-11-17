import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_admin_join_and_create_shopping_mall_seller(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication via join endpoint
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin-password-1234";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://admin.shoppingmall.test/join",
        referrer: "https://admin.shoppingmall.test/",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create a new shopping mall seller using authenticated admin connection
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller-password-1234";

  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.shoppingMallSellers.create(
      connection,
      {
        body: {
          email: sellerEmail,
          password: sellerPassword,
        } satisfies IShoppingMallSeller.ICreate,
      },
    );
  typia.assert(seller);

  // Step 3: Validate that the seller email in response matches the requested email
  TestValidator.equals(
    "seller email matches the requested email",
    seller.email,
    sellerEmail,
  );
  TestValidator.predicate(
    "seller has UUID format id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      seller.id,
    ),
  );
}
