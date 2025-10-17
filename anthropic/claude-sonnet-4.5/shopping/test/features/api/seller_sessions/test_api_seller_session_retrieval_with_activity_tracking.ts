import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller session creation and authentication workflow.
 *
 * This test validates the complete seller authentication lifecycle:
 *
 * 1. Seller account registration
 * 2. Email verification confirmation
 * 3. Session creation through authentication
 * 4. Multiple device authentication support
 * 5. JWT token issuance and validation
 *
 * Note: The original scenario requested session retrieval with activity
 * tracking, but no such endpoint exists in the available API functions. This
 * test focuses on what is actually implementable: seller registration,
 * verification, and authentication which creates sessions with JWT tokens.
 */
export async function test_api_seller_session_retrieval_with_activity_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create a new seller account
  const sellerCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: typia
      .random<
        number &
          tags.Type<"uint32"> &
          tags.Minimum<100000000> &
          tags.Maximum<999999999>
      >()
      .toString(),
  } satisfies IShoppingMallSeller.ICreate;

  const createdSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateData,
    });
  typia.assert(createdSeller);

  // Validate seller creation response
  TestValidator.equals(
    "seller email matches",
    createdSeller.email,
    sellerCreateData.email,
  );
  TestValidator.equals(
    "business name matches",
    createdSeller.business_name,
    sellerCreateData.business_name,
  );
  typia.assert(createdSeller.token);
  typia.assert(createdSeller.token.access);
  typia.assert(createdSeller.token.refresh);

  // Step 2: Verify email with token
  const verificationToken = typia.random<string>();
  const verificationResponse: IShoppingMallSeller.IVerifyEmailResponse =
    await api.functional.auth.seller.verification.confirm.verifyEmail(
      connection,
      {
        body: {
          token: verificationToken,
        } satisfies IShoppingMallSeller.IVerifyEmail,
      },
    );
  typia.assert(verificationResponse);

  // Step 3: Authenticate seller to create first session
  const loginData = {
    email: sellerCreateData.email,
    password: sellerCreateData.password,
  } satisfies IShoppingMallSeller.ILogin;

  const firstSessionResponse: IShoppingMallSeller.ILoginResponse =
    await api.functional.shoppingMall.sellers.sessions.post(connection, {
      body: loginData,
    });
  typia.assert(firstSessionResponse);
  TestValidator.equals(
    "first session seller ID matches",
    firstSessionResponse.id,
    createdSeller.id,
  );
  typia.assert(firstSessionResponse.token);

  // Step 4: Create second session (simulating multi-device login)
  const secondSessionResponse: IShoppingMallSeller.ILoginResponse =
    await api.functional.shoppingMall.sellers.sessions.post(connection, {
      body: loginData,
    });
  typia.assert(secondSessionResponse);
  TestValidator.equals(
    "second session seller ID matches",
    secondSessionResponse.id,
    createdSeller.id,
  );
  typia.assert(secondSessionResponse.token);

  // Step 5: Test alternative authentication endpoint (patchBySellerid)
  const alternativeAuthResponse: IShoppingMallSeller.ILoginResponse =
    await api.functional.shoppingMall.sellers.sessions.patchBySellerid(
      connection,
      {
        sellerId: createdSeller.id,
        body: loginData,
      },
    );
  typia.assert(alternativeAuthResponse);
  TestValidator.equals(
    "alternative auth seller ID matches",
    alternativeAuthResponse.id,
    createdSeller.id,
  );
  typia.assert(alternativeAuthResponse.token);
  typia.assert(alternativeAuthResponse.token.access);
  typia.assert(alternativeAuthResponse.token.refresh);

  // Validate that different sessions have different tokens
  TestValidator.notEquals(
    "first and second session tokens differ",
    firstSessionResponse.token.access,
    secondSessionResponse.token.access,
  );
  TestValidator.notEquals(
    "second and alternative session tokens differ",
    secondSessionResponse.token.access,
    alternativeAuthResponse.token.access,
  );
}
