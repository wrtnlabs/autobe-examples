import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate successful seller login returns coherent authorized seller session.
 *
 * This test exercises POST /auth/seller/login via the generated SDK function
 * api.functional.auth.seller.login and asserts that a successful call returns a
 * fully-populated IShoppingMallSeller.IAuthorized structure for a seller
 * actor.
 *
 * Since no seller signup or credential seeding API is available in this
 * context, the test relies on the SDK and backend configuration (including
 * possible simulation mode) to accept a randomly generated but structurally
 * valid IShoppingMallSellerLogin.IRequest. The focus is on verifying the
 * response schema and internal consistency of identity and token fields rather
 * than database side effects.
 *
 * Workflow:
 *
 * 1. Build a realistic seller login request body using
 *    IShoppingMallSellerLogin.IRequest with:
 *
 *    - Email: random RFC 5322-compliant email string
 *    - Password: random non-empty string
 *    - Href, referrer: valid URI strings (can be fixed or generated)
 *    - Ip: optional, may be omitted to let backend infer it
 * 2. Call api.functional.auth.seller.login(connection, { body }) and await the
 *    response.
 * 3. Use typia.assert<IShoppingMallSeller.IAuthorized>(output) to validate that
 *    the shape and formats are correct.
 * 4. Perform additional business-coherence checks:
 *
 *    - Email in response matches the submitted email.
 *    - Top-level fields and nested seller summary are consistent for id, email,
 *         store_name, and status.
 * 5. Validate token field structure:
 *
 *    - Access and refresh are non-empty strings.
 *    - Expired_at and refreshable_until are valid date-time strings; rely on
 *         typia.assert for format.
 *
 * No negative-path or HTTP-status-code assertions are performed; this test
 * strictly covers the happy path of successful login with valid credentials.
 */
export async function test_api_seller_login_success_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Build a realistic seller login request body
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const password: string = RandomGenerator.alphaNumeric(12);

  const body = {
    email,
    password,
    href,
    referrer,
  } satisfies IShoppingMallSellerLogin.IRequest;

  // 2. Call seller login API
  const authorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, { body });

  // 3. Validate response structure with typia.assert
  typia.assert<IShoppingMallSeller.IAuthorized>(authorized);

  // 4. Additional coherence checks between top-level fields and summary
  TestValidator.equals(
    "authorized email matches request email",
    authorized.email,
    email,
  );

  TestValidator.equals(
    "summary email matches top-level email",
    authorized.seller.email,
    authorized.email,
  );

  TestValidator.equals(
    "summary id matches top-level id",
    authorized.seller.id,
    authorized.id,
  );

  TestValidator.equals(
    "summary store_name matches top-level store_name",
    authorized.seller.store_name,
    authorized.store_name,
  );

  TestValidator.equals(
    "summary status matches top-level status",
    authorized.seller.status,
    authorized.status,
  );

  TestValidator.predicate(
    "store_name is non-empty",
    authorized.store_name.length > 0,
  );

  TestValidator.predicate("status is non-empty", authorized.status.length > 0);

  // 5. Validate token fields are non-empty; typia.assert already checked shape
  const token: IAuthorizationToken = authorized.token;
  TestValidator.predicate("access token is non-empty", token.access.length > 0);
  TestValidator.predicate(
    "refresh token is non-empty",
    token.refresh.length > 0,
  );
}
