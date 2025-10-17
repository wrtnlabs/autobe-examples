import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller account creation and multiple authentication sessions.
 *
 * This test validates seller registration and authentication functionality. Due
 * to API limitations, date range filtering of sessions cannot be tested as the
 * session listing/filtering endpoint is not available in the provided API.
 *
 * The test focuses on:
 *
 * - Creating a seller account successfully
 * - Authenticating multiple times to generate sessions
 * - Validating authentication responses
 *
 * Process:
 *
 * 1. Create a new seller account
 * 2. Authenticate multiple times to create sessions
 * 3. Validate authentication responses
 */
export async function test_api_seller_session_filtering_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const sellerCreateData = {
    email: sellerEmail,
    password: sellerPassword,
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>()} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const createdSeller = await api.functional.auth.seller.join(connection, {
    body: sellerCreateData,
  });
  typia.assert(createdSeller);

  TestValidator.predicate(
    "seller account created successfully",
    createdSeller.id !== null && createdSeller.id !== undefined,
  );

  TestValidator.equals(
    "seller email matches",
    createdSeller.email,
    sellerEmail,
  );

  // Step 2: Authenticate multiple times to create sessions
  const sessionCount = 3;
  const loginResponses: IShoppingMallSeller.ILoginResponse[] = [];

  for (let i = 0; i < sessionCount; i++) {
    const loginResponse =
      await api.functional.shoppingMall.sellers.sessions.post(connection, {
        body: {
          email: sellerEmail,
          password: sellerPassword,
        } satisfies IShoppingMallSeller.ILogin,
      });
    typia.assert(loginResponse);
    loginResponses.push(loginResponse);
  }

  // Step 3: Validate authentication responses
  TestValidator.predicate(
    "all authentication sessions created",
    loginResponses.length === sessionCount,
  );

  for (const loginResponse of loginResponses) {
    TestValidator.equals(
      "authenticated seller ID matches",
      loginResponse.id,
      createdSeller.id,
    );

    TestValidator.predicate(
      "access token exists",
      loginResponse.token.access !== null &&
        loginResponse.token.access !== undefined &&
        loginResponse.token.access.length > 0,
    );

    TestValidator.predicate(
      "refresh token exists",
      loginResponse.token.refresh !== null &&
        loginResponse.token.refresh !== undefined &&
        loginResponse.token.refresh.length > 0,
    );
  }
}
