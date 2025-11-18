import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate successful seller self-registration with minimal profile and issued
 * tokens.
 *
 * Business goal:
 *
 * - Ensure the public seller join endpoint can be called without prior
 *   authentication.
 * - Verify that a seller account is created with proper identity fields and
 *   lifecycle defaults.
 * - Confirm that an authorization token bundle is issued and attached to the
 *   response.
 * - If a profile is eagerly created, check that it has a minimal but coherent
 *   shape.
 *
 * Scenario steps:
 *
 * 1. Build a realistic IShoppingMallSellerAuthJoin.IRequest payload:
 *
 *    - Email: unique, well-formed business email.
 *    - Password: random string satisfying password format.
 *    - Href: realistic HTTPS URL of the registration page.
 *    - Referrer: realistic HTTPS URL of the referring page.
 *    - Ip: omit to exercise server-side derivation behavior (allowed by DTO).
 * 2. Call api.functional.auth.seller.join(connection, { body }).
 * 3. Use typia.assert to validate the response conforms to
 *    IShoppingMallSeller.IAuthorized.
 * 4. Business-level validations using TestValidator:
 *
 *    - Id is non-empty and looks like a UUID string (already structurally validated
 *         by typia).
 *    - Email in response equals the request email.
 *    - Deleted_at is null or undefined for a newly joined account.
 *    - Token.access and token.refresh are non-empty strings.
 *    - Token.expired_at and token.refreshable_until are non-empty date-time strings.
 * 5. If profile is present:
 *
 *    - Profile.shopping_mall_seller_id equals seller.id.
 *    - Profile.store_name is a non-empty string.
 *    - Profile.deleted_at is null or undefined.
 *
 * Notes:
 *
 * - Do not attempt error scenarios or type error tests; focus purely on the happy
 *   path.
 * - Do not manipulate connection.headers directly; rely on SDK behavior only.
 */
export async function test_api_seller_join_success_with_minimal_profile(
  connection: api.IConnection,
) {
  // 1. Prepare a realistic join request body
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const href: string & tags.Format<"uri"> =
    "https://merchant.example.com/auth/seller/join";
  const referrer: string & tags.Format<"uri"> =
    "https://merchant.example.com/marketing/onboarding";

  const body = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    href,
    referrer,
    // ip intentionally omitted to let server derive it; DTO allows absence
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  // 2. Call the join endpoint
  const authorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body });

  // 3. Structural validation of the response
  typia.assert<IShoppingMallSeller.IAuthorized>(authorized);

  // 4. Business-level validations
  // 4-1. Email must match the request
  TestValidator.equals(
    "seller email must match requested email",
    authorized.email,
    email,
  );

  // 4-2. deleted_at must be null or undefined for a freshly joined seller
  TestValidator.predicate(
    "newly joined seller must not be soft-deleted",
    authorized.deleted_at === null || authorized.deleted_at === undefined,
  );

  // 4-3. token fields must be non-empty strings
  const token: IAuthorizationToken = authorized.token;
  TestValidator.predicate(
    "access token must be non-empty",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token must be non-empty",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at must be non-empty",
    typeof token.expired_at === "string" && token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until must be non-empty",
    typeof token.refreshable_until === "string" &&
      token.refreshable_until.length > 0,
  );

  // 5. Optional profile validations when present
  const profile: IShoppingMallSellerProfile | undefined = authorized.profile;
  if (profile !== undefined) {
    // Basic structural validation via typia
    typia.assert<IShoppingMallSellerProfile>(profile);

    TestValidator.equals(
      "profile seller id must match authorized seller id",
      profile.shopping_mall_seller_id,
      authorized.id,
    );

    TestValidator.predicate(
      "profile.store_name must be non-empty",
      typeof profile.store_name === "string" && profile.store_name.length > 0,
    );

    TestValidator.predicate(
      "profile must not be soft-deleted on join",
      profile.deleted_at === null || profile.deleted_at === undefined,
    );
  }
}
