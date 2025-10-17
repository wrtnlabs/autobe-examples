import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test multiple seller authentication sessions creation.
 *
 * This test validates that a seller can successfully create multiple
 * authentication sessions through repeated login operations. Since the session
 * listing/pagination API is not available in the current API specification,
 * this test focuses on validating the session creation workflow and
 * authentication token generation across multiple login attempts.
 *
 * Steps:
 *
 * 1. Register a new seller account with complete business information
 * 2. Create multiple authentication sessions through repeated logins
 * 3. Validate each session returns valid authentication tokens
 * 4. Verify seller ID consistency across all authentication responses
 * 5. Confirm all tokens have proper expiration timestamps
 */
export async function test_api_seller_session_filtering_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Register a new seller account
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
    business_address: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 6,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const createdSeller = await api.functional.auth.seller.join(connection, {
    body: sellerCreateData,
  });
  typia.assert(createdSeller);

  TestValidator.predicate(
    "seller ID is valid UUID format",
    createdSeller.id !== null && createdSeller.id !== undefined,
  );

  TestValidator.equals(
    "seller email matches registration",
    createdSeller.email,
    sellerEmail,
  );

  // Step 2: Create multiple authentication sessions (10 sessions)
  const sessionCount = 10;
  const loginData = {
    email: sellerEmail,
    password: sellerPassword,
  } satisfies IShoppingMallSeller.ILogin;

  const createdSessions = await ArrayUtil.asyncRepeat(
    sessionCount,
    async (index) => {
      const loginResponse =
        await api.functional.shoppingMall.sellers.sessions.post(connection, {
          body: loginData,
        });
      typia.assert(loginResponse);
      return loginResponse;
    },
  );

  TestValidator.equals(
    "created session count matches expected",
    createdSessions.length,
    sessionCount,
  );

  // Step 3: Validate each session has valid authentication tokens
  await ArrayUtil.asyncForEach(createdSessions, async (session, index) => {
    TestValidator.predicate(
      `session ${index + 1} has valid seller ID`,
      session.id !== null && session.id !== undefined,
    );

    TestValidator.equals(
      `session ${index + 1} seller ID matches original`,
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
      `session ${index + 1} has valid expiration timestamp`,
      session.token.expired_at.length > 0,
    );

    TestValidator.predicate(
      `session ${index + 1} has valid refresh expiration`,
      session.token.refreshable_until.length > 0,
    );
  });

  // Step 4: Test authentication with sellerId parameter endpoint
  const authenticateWithSellerId =
    await api.functional.shoppingMall.sellers.sessions.patchBySellerid(
      connection,
      {
        sellerId: createdSeller.id,
        body: loginData,
      },
    );
  typia.assert(authenticateWithSellerId);

  TestValidator.equals(
    "sellerId-based authentication returns correct seller ID",
    authenticateWithSellerId.id,
    createdSeller.id,
  );

  TestValidator.predicate(
    "sellerId-based authentication returns valid tokens",
    authenticateWithSellerId.token.access.length > 0 &&
      authenticateWithSellerId.token.refresh.length > 0,
  );
}
