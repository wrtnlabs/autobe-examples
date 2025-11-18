import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate seller join + login happy path and ensure invalid credentials are
 * rejected.
 *
 * ## Business context
 *
 * The shopping mall platform exposes seller authentication via two public
 * endpoints:
 *
 * - POST /auth/seller/join -> api.functional.auth.seller.join
 *
 *   - Body: IShoppingMallSellerAuthJoin.IRequest
 *   - Response: IShoppingMallSeller.IAuthorized
 * - POST /auth/seller/login -> api.functional.auth.seller.login
 *
 *   - Body: IShoppingMallSellerAuthLogin.IRequest
 *   - Response: IShoppingMallSeller.IAuthorized
 *
 * The original scenario asks to verify that sellers in non-eligible statuses
 * (e.g., suspended or terminated) cannot log in. However, with the current SDK
 * surface we cannot:
 *
 * - Directly set or mutate seller.status to suspended/terminated, or
 * - Observe internal session/security event tables.
 *
 * Therefore, this test focuses on the observable behavior that _is_
 * implementable:
 *
 * 1. A seller created via /auth/seller/join can successfully log in with the same
 *    credentials via /auth/seller/login.
 * 2. A login attempt with the correct email but wrong password is rejected (i.e.,
 *    throws an HttpError) and therefore does not yield an
 *    IShoppingMallSeller.IAuthorized response.
 *
 * This still validates key aspects of the authentication flow while remaining
 * within the constraints of the provided API.
 */
export async function test_api_seller_login_rejects_ineligible_account_status(
  connection: api.IConnection,
) {
  // 1. Register a new seller using /auth/seller/join with random but valid data.
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional and nullable, we omit it so it stays undefined
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const joinedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequestBody,
    });
  // Validate the response structure at type level.
  typia.assert(joinedSeller);

  // Business sanity checks on the join response.
  TestValidator.equals(
    "joined seller email matches join request",
    joinedSeller.email,
    joinRequestBody.email,
  );
  TestValidator.predicate(
    "joined seller has non-empty status",
    joinedSeller.status.length > 0,
  );
  TestValidator.predicate(
    "joined seller has token with non-empty access token",
    joinedSeller.token.access.length > 0,
  );

  // 2. Perform a successful login with the same credentials via /auth/seller/login.
  const loginRequestBody = {
    email: joinRequestBody.email,
    password: joinRequestBody.password,
    // ip is optional string | null | undefined; we set it to null explicitly
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const loggedInSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginRequestBody,
    });
  typia.assert(loggedInSeller);

  // Validate that login returns a consistent seller identity and a fresh token.
  TestValidator.equals(
    "logged-in seller id equals joined seller id",
    loggedInSeller.id,
    joinedSeller.id,
  );
  TestValidator.equals(
    "logged-in seller email equals joined seller email",
    loggedInSeller.email,
    joinedSeller.email,
  );
  TestValidator.notEquals(
    "login issues a new access token different from join token",
    loggedInSeller.token.access,
    joinedSeller.token.access,
  );

  // 3. Attempt login with the same email but an incorrect password and
  //    verify that authentication fails.
  const invalidLoginRequestBody = {
    email: joinRequestBody.email,
    password: `${joinRequestBody.password}-wrong`,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  await TestValidator.error(
    "login with incorrect password must fail and not return authorized seller",
    async () => {
      // This call is expected to throw (e.g., HttpError); if it returns
      // successfully, TestValidator.error will treat that as a failure.
      await api.functional.auth.seller.login(connection, {
        body: invalidLoginRequestBody,
      });
    },
  );
}
