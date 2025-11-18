import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Verify that seller join enforces password policy at registration time.
 *
 * Business goal:
 *
 * - Ensure that obviously weak passwords are rejected during seller
 *   self-registration.
 * - Ensure that a strong password with the same email can successfully register.
 *
 * Due to limited knowledge of exact password rules and prohibition on
 * type-error tests, this E2E spec focuses on behavioral expectations:
 *
 * - Multiple join attempts with syntactically valid but weak-looking passwords
 *   should fail (throw an HttpError).
 * - A join attempt with a clearly strong password should succeed and return an
 *   IShoppingMallSeller.IAuthorized object with consistent data.
 *
 * Steps:
 *
 * 1. Generate a single valid email and common href/referrer URIs.
 * 2. Build an array of weak password candidates that still satisfy
 *    tags.Format<"password"> semantics (we treat all as syntactically valid).
 * 3. For each weak password, construct IShoppingMallSellerAuthJoin.IRequest and
 *    assert that api.functional.auth.seller.join throws using
 *    TestValidator.error.
 * 4. Construct a strong password candidate with length and character variety, and
 *    assert that join succeeds, returning IShoppingMallSeller.IAuthorized.
 * 5. Validate the success result via typia.assert and a couple of logical equality
 *    checks (e.g., email echo).
 */
export async function test_api_seller_join_enforces_password_policy(
  connection: api.IConnection,
) {
  // 1. Prepare shared fields: email, href, referrer.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const href: string & tags.Format<"uri"> =
    "https://seller-portal.example.com/join" as string & tags.Format<"uri">;
  const referrer: string & tags.Format<"uri"> =
    "https://seller-portal.example.com/landing" as string & tags.Format<"uri">;

  // 2. Prepare weak-looking password candidates (still syntactically valid strings).
  // We do not know exact policy, but these are intended to look weak.
  const weakPasswords: string[] = ["12345678", "password1", "qwerty123"];

  // 3. Try join with each weak password and expect an error.
  for (const weak of weakPasswords) {
    const weakRequestBody = {
      email,
      password: weak,
      href,
      referrer,
    } satisfies IShoppingMallSellerAuthJoin.IRequest;

    await TestValidator.error(
      "weak password should be rejected on join",
      async () => {
        await api.functional.auth.seller.join(connection, {
          body: weakRequestBody,
        });
      },
    );
  }

  // 4. Attempt join with a strong password and expect success.
  const strongPassword = "Str0ng!Passw0rd#";
  const strongRequestBody = {
    email,
    password: strongPassword,
    href,
    referrer,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const authorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: strongRequestBody,
    });

  // 5. Validate response structure and core business fields.
  typia.assert<IShoppingMallSeller.IAuthorized>(authorized);

  TestValidator.equals(
    "joined seller email should match request email",
    authorized.email,
    email,
  );

  // Basic sanity checks on token presence via typia.assert on nested token.
  typia.assert<IAuthorizationToken>(authorized.token);
}
