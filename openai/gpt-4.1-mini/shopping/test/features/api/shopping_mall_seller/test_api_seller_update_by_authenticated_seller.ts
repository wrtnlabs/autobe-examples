import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_update_by_authenticated_seller(
  connection: api.IConnection,
) {
  // 1. Create admin user for admin operations
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "1234";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "",
        referrer: "",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create seller via admin endpoint
  // Switch to admin authorization context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "",
      referrer: "",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Prepare seller creation data
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.shoppingMallSellers.create(
      connection,
      {
        body: sellerCreateBody,
      },
    );
  typia.assert(seller);

  // 3. Seller login to authenticate and receive tokens
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerCreateBody.email,
        password: sellerCreateBody.password,
        ip: null,
        href: "",
        referrer: "",
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(sellerLogin);

  // 4. Seller updates profile email
  // generate new email
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updatedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.seller.shoppingMallSellers.update(
      connection,
      {
        shoppingMallSellerId: seller.id,
        body: {
          email: newEmail,
        } satisfies IShoppingMallSeller.IUpdate,
      },
    );
  typia.assert(updatedSeller);

  // 5. Verify update - the updated seller id matches original, email matches updated
  TestValidator.equals(
    "updated seller id matches original",
    updatedSeller.id,
    seller.id,
  );
  TestValidator.equals(
    "updated seller email matches new",
    updatedSeller.email,
    newEmail,
  );
}
