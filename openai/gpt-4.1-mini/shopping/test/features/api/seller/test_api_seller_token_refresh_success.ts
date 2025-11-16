import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Create a new seller with realistic data
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;

  const sellerCreated: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(sellerCreated);

  // 2. Login with the created seller account
  const sellerLoginBody = {
    email: sellerCreateBody.email,
    password: sellerCreateBody.password,
    href: "http://localhost/",
    referrer: "http://localhost/",
  } satisfies IShoppingMallSeller.ILogin;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  TestValidator.equals(
    "Seller id after login",
    sellerCreated.id,
    sellerLoggedIn.id,
  );
  TestValidator.equals(
    "Seller email after login",
    sellerCreated.email,
    sellerLoggedIn.email,
  );
  TestValidator.equals(
    "Seller status after login",
    sellerCreated.status,
    sellerLoggedIn.status,
  );
  TestValidator.equals(
    "Seller business status after login",
    sellerCreated.business_status,
    sellerLoggedIn.business_status,
  );

  // 3. Refresh token using the refresh token from login response
  const refreshBody = {
    refresh_token: sellerLoggedIn.token.refresh,
  } satisfies IShoppingMallSeller.IRefresh;

  const sellerRefreshed: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.refresh(connection, { body: refreshBody });
  typia.assert(sellerRefreshed);

  TestValidator.equals(
    "Seller id after refresh",
    sellerLoggedIn.id,
    sellerRefreshed.id,
  );
  TestValidator.equals(
    "Seller email after refresh",
    sellerLoggedIn.email,
    sellerRefreshed.email,
  );
  TestValidator.equals(
    "Seller status after refresh",
    sellerLoggedIn.status,
    sellerRefreshed.status,
  );
  TestValidator.equals(
    "Seller business status after refresh",
    sellerLoggedIn.business_status,
    sellerRefreshed.business_status,
  );

  TestValidator.predicate(
    "Access token is non-empty after refresh",
    sellerRefreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "Refresh token is non-empty after refresh",
    sellerRefreshed.token.refresh.length > 0,
  );
}
