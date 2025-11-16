import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_login_success(
  connection: api.IConnection,
) {
  // Create a new seller account with realistic data
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerCreateBody = {
    email: sellerEmail,
    password: "password123",
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // Prepare login body with required context
  const loginBody = {
    email: sellerEmail,
    password: "password123",
    ip: null, // optional, passing explicit null
    href: "https://example.com/login",
    referrer: "https://example.com/",
  } satisfies IShoppingMallSeller.ILogin;

  // Perform login API call
  const loginResponse: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResponse);

  // Validate key business logic values
  TestValidator.equals(
    "login email matches input",
    loginResponse.email,
    sellerCreateBody.email,
  );
  TestValidator.equals("status is active", loginResponse.status, "active");
  TestValidator.equals(
    "business status is approved",
    loginResponse.business_status,
    "approved",
  );
}
