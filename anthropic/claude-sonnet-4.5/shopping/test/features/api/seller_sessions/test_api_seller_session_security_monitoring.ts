import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller session creation for security monitoring foundation.
 *
 * This test validates the seller session creation workflow by:
 *
 * 1. Creating a seller account with complete business information
 * 2. Verifying the seller's email address to enable authentication
 * 3. Authenticating multiple times to create diverse sessions with JWT tokens
 * 4. Validating each session creation returns proper authentication tokens
 *
 * Note: This test focuses on session creation capabilities. The actual session
 * list retrieval and security monitoring features require additional API
 * endpoints not currently available in the provided materials.
 */
export async function test_api_seller_session_security_monitoring(
  connection: api.IConnection,
) {
  // Step 1: Create a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const createData = {
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
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name()} Street, ${RandomGenerator.name()} City`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const createdSeller = await api.functional.auth.seller.join(connection, {
    body: createData,
  });
  typia.assert(createdSeller);

  TestValidator.predicate(
    "created seller has valid ID",
    createdSeller.id.length > 0,
  );

  TestValidator.equals(
    "created seller email matches input",
    createdSeller.email,
    sellerEmail,
  );

  TestValidator.equals(
    "created seller business name matches input",
    createdSeller.business_name,
    createData.business_name,
  );

  // Step 2: Verify seller email with verification token
  const verificationToken = RandomGenerator.alphaNumeric(32);

  const verificationResult =
    await api.functional.auth.seller.verification.confirm.verifyEmail(
      connection,
      {
        body: {
          token: verificationToken,
        } satisfies IShoppingMallSeller.IVerifyEmail,
      },
    );
  typia.assert(verificationResult);

  TestValidator.predicate(
    "verification response contains message",
    verificationResult.message.length > 0,
  );

  // Step 3: Create multiple sessions through repeated authentication
  const sessionCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>
  >();

  const sessions = await ArrayUtil.asyncRepeat(sessionCount, async (index) => {
    const loginData = {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin;

    const sessionResponse =
      await api.functional.shoppingMall.sellers.sessions.post(connection, {
        body: loginData,
      });
    typia.assert(sessionResponse);

    return sessionResponse;
  });

  // Step 4: Validate each session creation
  TestValidator.predicate(
    "created expected number of sessions",
    sessions.length === sessionCount,
  );

  await ArrayUtil.asyncForEach(sessions, async (session, index) => {
    TestValidator.equals(
      `session ${index + 1} seller ID matches created seller`,
      session.id,
      createdSeller.id,
    );

    TestValidator.predicate(
      `session ${index + 1} has access token`,
      session.token.access.length > 0,
    );

    TestValidator.predicate(
      `session ${index + 1} has refresh token`,
      session.token.refresh.length > 0,
    );

    TestValidator.predicate(
      `session ${index + 1} has expiration timestamp`,
      session.token.expired_at.length > 0,
    );

    TestValidator.predicate(
      `session ${index + 1} has refresh expiration timestamp`,
      session.token.refreshable_until.length > 0,
    );
  });

  // Validate that each session has unique tokens
  const accessTokens = sessions.map((s) => s.token.access);
  const uniqueAccessTokens = new Set(accessTokens);

  TestValidator.predicate(
    "all sessions have unique access tokens",
    uniqueAccessTokens.size === sessions.length,
  );

  const refreshTokens = sessions.map((s) => s.token.refresh);
  const uniqueRefreshTokens = new Set(refreshTokens);

  TestValidator.predicate(
    "all sessions have unique refresh tokens",
    uniqueRefreshTokens.size === sessions.length,
  );
}
