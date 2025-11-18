import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that hard-deleting a non-existent country fails with an error for an
 * authorized admin.
 *
 * Business context:
 *
 * - Platform admins can use DELETE /shoppingMall/admin/countries/{countryCode} to
 *   hard-delete country master data records in exceptional cleanup workflows.
 * - For data integrity and observability, attempts to delete a country that does
 *   not exist must not silently succeed or look like a normal 204 deletion.
 * - Instead, the API should signal a not-found condition via an HTTP error so
 *   that admins and monitoring tools can distinguish between successful
 *   deletions and no-op attempts.
 *
 * Steps:
 *
 * 1. Join as an admin using POST /auth/admin/join. This both creates the admin
 *    record and, via the SDK, stores the access token on the connection for
 *    subsequent authenticated calls.
 * 2. Define a clearly fake country code (e.g., "NO_SUCH_COUNTRY_123") that is
 *    extremely unlikely to exist and is never created during the test.
 * 3. Call DELETE /shoppingMall/admin/countries/{countryCode} with that
 *    non-existent code.
 * 4. Assert that the call results in an error rather than a successful void
 *    response.
 *
 * Validation focus:
 *
 * - The erase endpoint does not report success when the target country row does
 *   not exist.
 * - With valid admin credentials, failure is due to the missing resource, not
 *   authorization.
 * - We only assert that an error occurs; we deliberately do not validate concrete
 *   HTTP status codes or error payload contents in this test.
 */
export async function test_api_admin_country_hard_delete_nonexistent_country(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin so that the connection carries a valid token.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Optional ip: let it be omitted so the backend can infer it; referrer/href are required.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Choose a clearly non-existent country code.
  const nonexistentCountryCode = "NO_SUCH_COUNTRY_123";

  // 3 & 4. Attempt to hard-delete the non-existent country and assert that it fails.
  await TestValidator.error(
    "hard delete of non-existent country must result in error",
    async () => {
      await api.functional.shoppingMall.admin.countries.erase(connection, {
        countryCode: nonexistentCountryCode,
      });
    },
  );
}
