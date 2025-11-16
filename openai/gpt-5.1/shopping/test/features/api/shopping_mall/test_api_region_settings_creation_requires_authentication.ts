import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Verify that region settings creation is rejected without platformAdmin
 * authentication and succeeds when properly authenticated.
 *
 * Business context:
 *
 * - POST /shoppingMall/platformAdmin/regionSettings is a privileged configuration
 *   API intended only for platform administrators.
 * - The scenario requires confirming that unauthenticated or improperly
 *   authenticated callers cannot create region configuration records, while
 *   valid platformAdmin sessions can.
 *
 * Test steps:
 *
 * 1. Prepare a valid region configuration payload using
 *    IShoppingMallRegionSetting.ICreate (code, name, active, and optional
 *    metadata fields).
 * 2. Create an unauthenticated connection by cloning the given connection and
 *    overriding headers to an empty object. This connection must not carry any
 *    Authorization token.
 * 3. Attempt to call
 *    api.functional.shoppingMall.platformAdmin.regionSettings.create with the
 *    unauthenticated connection and the valid payload. Wrap this call in `await
 *    TestValidator.error` with a descriptive title to assert that an error is
 *    thrown for the unauthenticated request. Do not assert specific HTTP status
 *    codes or error bodies.
 * 4. Use the dependency endpoint api.functional.auth.platformAdmin.join with a
 *    random-but-valid IShoppingMallPlatformAdminJoin.IRequest to register a
 *    platform admin and establish an authenticated session on the original
 *    `connection`. The SDK will automatically set the Authorization header.
 *    Validate the returned IShoppingMallPlatformAdmin.IAuthorized with
 *    typia.assert.
 * 5. Reuse the same region configuration payload and call
 *    api.functional.shoppingMall.platformAdmin.regionSettings.create with the
 *    authenticated `connection`. Assert success and validate the response as
 *    IShoppingMallRegionSetting using typia.assert.
 * 6. Use TestValidator.equals with descriptive titles to ensure that key fields
 *    such as `code`, `name`, and `active` in the response match the original
 *    request body. For optional metadata fields (iso_country_code,
 *    currency_code, timezone), only compare them when they are not null or
 *    undefined in the request.
 *
 * Notes and constraints:
 *
 * - We do not test specific HTTP status codes or error bodies; we only assert
 *   that an error occurs for the unauthenticated call.
 * - We do not manually inspect or mutate `connection.headers` beyond creating an
 *   unauthenticated copy with `headers: {}`.
 * - We do not implement the optional "invalid or malformed token" case from the
 *   scenario draft because manual header manipulation for tokens is
 *   prohibited.
 * - We cannot directly verify persistence (no list/search API), but the fact that
 *   the authenticated creation succeeds after the unauthenticated failure
 *   provides evidence that the unauthenticated request did not create a
 *   conflicting record.
 */
export async function test_api_region_settings_creation_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Prepare a valid region configuration payload
  const regionBody = typia.random<IShoppingMallRegionSetting.ICreate>();

  // 2. Build an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Unauthenticated call must fail
  await TestValidator.error(
    "region settings creation should fail without authentication",
    async () => {
      await api.functional.shoppingMall.platformAdmin.regionSettings.create(
        unauthenticatedConnection,
        {
          body: regionBody,
        },
      );
    },
  );

  // 4. Join as platform admin to obtain authenticated session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 5. Authenticated creation must succeed
  const created: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: regionBody,
      },
    );
  typia.assert<IShoppingMallRegionSetting>(created);

  // 6. Validate key fields match between request and response
  TestValidator.equals(
    "region code should match request",
    created.code,
    regionBody.code,
  );
  TestValidator.equals(
    "region name should match request",
    created.name,
    regionBody.name,
  );
  TestValidator.equals(
    "region active flag should match request",
    created.active,
    regionBody.active,
  );

  if (
    regionBody.iso_country_code !== null &&
    regionBody.iso_country_code !== undefined
  ) {
    TestValidator.equals(
      "iso_country_code should match when provided",
      created.iso_country_code,
      regionBody.iso_country_code,
    );
  }
  if (
    regionBody.currency_code !== null &&
    regionBody.currency_code !== undefined
  ) {
    TestValidator.equals(
      "currency_code should match when provided",
      created.currency_code,
      regionBody.currency_code,
    );
  }
  if (regionBody.timezone !== null && regionBody.timezone !== undefined) {
    TestValidator.equals(
      "timezone should match when provided",
      created.timezone,
      regionBody.timezone,
    );
  }
}
