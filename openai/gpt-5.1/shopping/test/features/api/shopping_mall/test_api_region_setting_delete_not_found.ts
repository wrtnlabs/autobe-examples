import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify behavior when a platform admin deletes a non-existent region setting.
 *
 * Business purpose:
 *
 * - Ensure that DELETE /shoppingMall/platformAdmin/regionSettings/{regionCode}
 *   behaves safely when the specified region does not exist.
 * - Confirm that a platform admin session is required and that the backend
 *   responds with a not-found style HTTP error (404) rather than succeeding or
 *   silently ignoring the request.
 * - Indirectly verify that no destructive side effects occur when attempting to
 *   delete a missing region by ensuring repeated calls continue to yield
 *   consistent not-found behavior.
 *
 * Test steps:
 *
 * 1. Join as a new platform admin using POST /auth/platformAdmin/join, which
 *    returns IShoppingMallPlatformAdmin.IAuthorized and stores the access token
 *    into connection.headers.Authorization.
 * 2. Generate a clearly non-existent region code string, for example
 *    "non-existent-region-" plus a random alphanumeric suffix.
 * 3. Call DELETE /shoppingMall/platformAdmin/regionSettings/{regionCode} with that
 *    region code via
 *    api.functional.shoppingMall.platformAdmin.regionSettings.erase and assert
 *    that it throws an HttpError with status 404 using
 *    TestValidator.httpError.
 * 4. Repeat the same operation with a second, different non-existent region code
 *    to ensure the behavior is consistent and idempotent.
 * 5. Because no listing or query APIs for region settings are available in the
 *    materials, treat consistent 404 responses and lack of success as evidence
 *    that no unintended side effects occur.
 */
export async function test_api_region_setting_delete_not_found(
  connection: api.IConnection,
) {
  // 1. Establish a platform admin session via join
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Generate clearly non-existent region codes
  const regionCode1 = `non-existent-region-${RandomGenerator.alphaNumeric(16)}`;
  const regionCode2 = `non-existent-region-${RandomGenerator.alphaNumeric(16)}`;

  // 3. Assert that deleting a non-existent region returns 404 HttpError
  await TestValidator.httpError(
    "delete non-existent region should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.platformAdmin.regionSettings.erase(
        connection,
        {
          regionCode: regionCode1,
        },
      );
    },
  );

  // 4. Repeat with another non-existent region code to ensure consistent behavior
  await TestValidator.httpError(
    "delete another non-existent region should also return 404",
    404,
    async () => {
      await api.functional.shoppingMall.platformAdmin.regionSettings.erase(
        connection,
        {
          regionCode: regionCode2,
        },
      );
    },
  );
}
