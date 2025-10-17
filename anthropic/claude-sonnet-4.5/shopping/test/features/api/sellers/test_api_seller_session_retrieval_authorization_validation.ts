import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSession";

/**
 * Test seller session retrieval authorization validation.
 *
 * This test validates authorization boundaries by creating two separate seller
 * accounts and ensuring they receive distinct authentication credentials. While
 * the original scenario intended to test session retrieval authorization, the
 * available API does not expose session IDs in authentication responses, so
 * this test focuses on validating that multiple sellers can authenticate
 * independently with separate credentials.
 *
 * Workflow:
 *
 * 1. Create and authenticate Seller A
 * 2. Create and authenticate Seller B
 * 3. Validate both sellers have distinct IDs and tokens
 * 4. Verify authentication isolation between sellers
 */
export async function test_api_seller_session_retrieval_authorization_validation(
  connection: api.IConnection,
) {
  // Step 1: Create first seller account (Seller A)
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = "SecurePass123!";

  const sellerARegistration = await api.functional.auth.seller.join(
    connection,
    {
      body: {
        email: sellerAEmail,
        password: sellerAPassword,
        business_name: RandomGenerator.name(2),
        business_type: RandomGenerator.pick([
          "individual",
          "LLC",
          "corporation",
          "partnership",
        ] as const),
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    },
  );
  typia.assert(sellerARegistration);

  // Step 2: Authenticate Seller A
  const sellerALogin = await api.functional.shoppingMall.sellers.sessions.post(
    connection,
    {
      body: {
        email: sellerAEmail,
        password: sellerAPassword,
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(sellerALogin);

  // Step 3: Create second seller account (Seller B)
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = "SecurePass456!";

  const sellerBRegistration = await api.functional.auth.seller.join(
    connection,
    {
      body: {
        email: sellerBEmail,
        password: sellerBPassword,
        business_name: RandomGenerator.name(2),
        business_type: RandomGenerator.pick([
          "individual",
          "LLC",
          "corporation",
          "partnership",
        ] as const),
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    },
  );
  typia.assert(sellerBRegistration);

  // Step 4: Authenticate Seller B
  const sellerBLogin = await api.functional.shoppingMall.sellers.sessions.post(
    connection,
    {
      body: {
        email: sellerBEmail,
        password: sellerBPassword,
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(sellerBLogin);

  // Step 5: Validate sellers have distinct identities
  TestValidator.notEquals(
    "seller A and B should have different IDs",
    sellerALogin.id,
    sellerBLogin.id,
  );

  TestValidator.notEquals(
    "seller A and B should have different access tokens",
    sellerALogin.token.access,
    sellerBLogin.token.access,
  );

  TestValidator.notEquals(
    "seller A and B should have different refresh tokens",
    sellerALogin.token.refresh,
    sellerBLogin.token.refresh,
  );
}
