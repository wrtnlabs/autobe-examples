import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that admin registration rejects duplicate emails.
 *
 * Business goal:
 *
 * - Ensure the POST /auth/admin/join endpoint enforces the unique constraint on
 *   shopping_mall_admins.email.
 * - Confirm that the first registration with a given email succeeds and returns a
 *   valid IShoppingMallAdmin.IAuthorized payload.
 * - Confirm that a second registration attempt with the same email is rejected as
 *   a business error (duplicate email), without checking specific HTTP status
 *   codes or error message contents.
 *
 * Test steps:
 *
 * 1. Build a random admin join payload using IShoppingMallAdminJoin.ICreate with a
 *    random email (Format<"email">), a random password (Format<"password">),
 *    and realistic href/referrer URIs.
 * 2. Call api.functional.auth.admin.join(connection, { body }) and assert:
 *
 *    - The call succeeds (no error thrown).
 *    - The response passes typia.assert<IShoppingMallAdmin.IAuthorized>().
 *    - The response.email equals the request email.
 * 3. Build a second join payload with the same email but a new password, and new
 *    href/referrer values, still satisfying IShoppingMallAdminJoin.ICreate.
 * 4. Use TestValidator.error with an async closure to assert that the second
 *    api.functional.auth.admin.join call throws (business rule violation for
 *    duplicate email). Do not check exp.status or error message; only assert
 *    that an error occurs.
 *
 * Notes and constraints:
 *
 * - Use only DTOs and API functions provided: IShoppingMallAdminJoin.ICreate for
 *   request bodies and IShoppingMallAdmin.IAuthorized for responses.
 * - Do not touch connection.headers: the SDK manages Authorization headers
 *   automatically when join succeeds.
 * - Do not test specific HTTP status codes or error payload structure.
 * - Do not create any type errors or invalid DTO shapes; both join calls must use
 *   fully valid IShoppingMallAdminJoin.ICreate bodies.
 */
export async function test_api_admin_join_rejects_duplicate_email(
  connection: api.IConnection,
) {
  // 1. First successful admin registration with unique email
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const firstJoinBody = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const firstAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: firstJoinBody,
    });

  // Type-level validation of response
  typia.assert<IShoppingMallAdmin.IAuthorized>(firstAuthorized);

  // Basic business sanity checks
  TestValidator.equals(
    "first join: response email matches requested email",
    firstAuthorized.email,
    email,
  );
  TestValidator.predicate(
    "first join: access token should be non-empty string",
    firstAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "first join: refresh token should be non-empty string",
    firstAuthorized.token.refresh.length > 0,
  );

  // 2. Second admin registration attempt with the same email
  const secondJoinBody = {
    email, // same email to trigger uniqueness violation
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  await TestValidator.error(
    "second join with duplicate admin email must fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: secondJoinBody,
      });
    },
  );
}
