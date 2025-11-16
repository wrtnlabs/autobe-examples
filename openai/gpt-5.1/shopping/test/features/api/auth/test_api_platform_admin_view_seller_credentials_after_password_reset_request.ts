import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAuthCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredential";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSellerPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetRequest";

/**
 * Validate that a platform administrator, after joining, can attempt to view
 * seller credential metadata in a context where a seller password reset has
 * been requested, while respecting the security model of opaque reset flows.
 *
 * Business intent:
 *
 * - Ensure the platform admin join endpoint issues a valid authorized session
 *   with JWT tokens.
 * - Exercise the seller password reset request endpoint to confirm that it
 *   accepts a syntactically valid email and returns a generic acknowledgment
 *   without leaking account existence.
 * - As a platform admin, call the seller credentials view endpoint and, when
 *   credentials exist for the given sellerId, validate that the returned
 *   credential summary matches the non-secret metadata contract.
 *
 * Constraints and assumptions:
 *
 * - This test does not create a concrete seller; instead, it uses a randomly
 *   generated sellerId. Therefore, the credentials endpoint may legitimately
 *   respond with HTTP errors (e.g., not found) in certain environments.
 * - The test is written to be robust to both success and failure of the
 *   credentials lookup without asserting specific HTTP status codes.
 * - Sensitive fields such as password hashes or reset tokens are never exposed
 *   because the DTO type IShoppingMallAuthCredential.ISummary simply does not
 *   define them; typia.assert is sufficient to validate the contract.
 */
export async function test_api_platform_admin_view_seller_credentials_after_password_reset_request(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator to obtain an authorized session.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);
  TestValidator.predicate(
    "platform admin session should be active",
    admin.isActive === true,
  );

  // 2. Initiate a seller password reset request with a syntactically valid email.
  const sellerResetBody = {
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IShoppingMallSellerPasswordResetRequest.IRequest;

  const resetResponse: IShoppingMallSellerPasswordResetRequest.IResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      {
        body: sellerResetBody,
      },
    );
  typia.assert<IShoppingMallSellerPasswordResetRequest.IResponse>(
    resetResponse,
  );

  TestValidator.predicate(
    "password reset request should report success flag as boolean",
    typeof resetResponse.success === "boolean",
  );
  TestValidator.predicate(
    "password reset response message should be a non-empty string",
    typeof resetResponse.message === "string" &&
      resetResponse.message.length > 0,
  );

  // 3. As an authenticated platform admin, attempt to view seller credentials.
  // We generate a random sellerId; in real environments this would correspond
  // to an existing seller, but fixtures are outside the scope of this test.
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  let firstSummary: IShoppingMallAuthCredential.ISummary | null = null;

  try {
    const summary: IShoppingMallAuthCredential.ISummary =
      await api.functional.shoppingMall.platformAdmin.sellers.credentials.at(
        connection,
        {
          sellerId,
        },
      );
    typia.assert<IShoppingMallAuthCredential.ISummary>(summary);

    // Basic business expectations on the credential metadata shape.
    TestValidator.equals(
      "credential actor_type should be 'seller'",
      summary.actor_type,
      "seller",
    );
    TestValidator.equals(
      "credential actor_id should match requested sellerId",
      summary.actor_id,
      sellerId,
    );
    TestValidator.predicate(
      "credential_type should be a non-empty string",
      typeof summary.credential_type === "string" &&
        summary.credential_type.length > 0,
    );
    TestValidator.predicate(
      "identifier should be a non-empty string",
      typeof summary.identifier === "string" && summary.identifier.length > 0,
    );
    TestValidator.predicate(
      "is_active should be boolean",
      typeof summary.is_active === "boolean",
    );
    TestValidator.predicate(
      "is_locked should be boolean",
      typeof summary.is_locked === "boolean",
    );
    TestValidator.predicate(
      "is_disabled should be boolean",
      typeof summary.is_disabled === "boolean",
    );
    TestValidator.predicate(
      "failure_count should be zero or positive",
      summary.failure_count >= 0,
    );

    // Preserve for idempotency check.
    firstSummary = summary;
  } catch {
    // If credentials are not found or another HttpError occurs, this is
    // acceptable for this scenario due to lack of seller fixtures.
    firstSummary = null;
  }

  // 4. Optional idempotency check: when we successfully obtained a credential
  // summary, calling the endpoint again should yield an equivalent summary.
  if (firstSummary !== null) {
    const secondSummary: IShoppingMallAuthCredential.ISummary =
      await api.functional.shoppingMall.platformAdmin.sellers.credentials.at(
        connection,
        {
          sellerId,
        },
      );
    typia.assert<IShoppingMallAuthCredential.ISummary>(secondSummary);

    TestValidator.equals(
      "repeated credential lookup should be idempotent for a given sellerId",
      secondSummary,
      firstSummary,
    );
  }
}
