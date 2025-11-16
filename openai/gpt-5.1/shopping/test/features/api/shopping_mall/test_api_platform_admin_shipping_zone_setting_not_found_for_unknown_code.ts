import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallShippingZoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingZoneSetting";

/**
 * Validate not-found behavior when querying an unknown shipping zone code.
 *
 * Business goal: Ensure that the platform-admin shipping zone configuration
 * lookup endpoint (`GET
 * /shoppingMall/platformAdmin/shippingZoneSettings/{shippingZoneCode}`) behaves
 * safely and predictably when requested with a business code that does not
 * correspond to any existing shipping zone, even in a realistically configured
 * platform environment.
 *
 * Scenario steps:
 *
 * 1. Bootstrap a platform administrator session
 *
 *    - Call `api.functional.auth.platformAdmin.join` with a realistic
 *         IShoppingMallPlatformAdminJoin.IRequest payload.
 *    - Rely on the SDK to wire the returned access token into
 *         `connection.headers.Authorization` automatically.
 *    - Assert the returned IShoppingMallPlatformAdmin.IAuthorized structure via
 *         `typia.assert` to guarantee type correctness.
 * 2. Create background configuration entities (optional but recommended)
 *
 *    - Create at least one policy setting via
 *         `api.functional.shoppingMall.platformAdmin.policySettings.create`
 *         using IShoppingMallPolicySetting.ICreate and
 *         `typia.random`/RandomGenerator to populate fields like `code`,
 *         `name`, `category`, and optional description/config payload.
 *    - Create a cancellation policy via
 *         `api.functional.shoppingMall.platformAdmin.cancellationPolicies.create`
 *         with IShoppingMallCancellationPolicy.ICreate, referencing the policy
 *         or region codes when appropriate.
 *    - Create a refund policy via
 *         `api.functional.shoppingMall.platformAdmin.refundPolicies.create`
 *         using IShoppingMallRefundPolicy.ICreate.
 *    - Create at least one region setting via
 *         `api.functional.shoppingMall.platformAdmin.regionSettings.create`
 *         with IShoppingMallRegionSetting.ICreate. These steps make the
 *         environment non-empty but must intentionally avoid creating any
 *         shipping zone linked to the sentinel test code.
 * 3. Choose a clearly non-existent shipping zone code
 *
 *    - Define a constant sentinel string such as
 *         "**E2E_UNKNOWN_SHIPPING_ZONE_CODE**".
 *    - Ensure it is distinct from any randomly generated codes used for policy,
 *         cancellation, refund, and region entities in this test.
 * 4. Call the shipping zone settings lookup with the unknown code
 *
 *    - Use `await TestValidator.error` with a descriptive title to assert that
 *         calling
 *         `api.functional.shoppingMall.platformAdmin.shippingZoneSettings.at`
 *         with `shippingZoneCode` set to the sentinel value throws an error.
 *    - The callback passed to TestValidator.error must be `async` and must `await`
 *         the API call.
 *    - Do not assert specific HTTP status codes or error payload structure; simply
 *         confirm that the operation fails (error is thrown) in this
 *         situation.
 * 5. Do not manipulate headers manually
 *
 *    - Never touch `connection.headers` directly. The SDK manages Authorization
 *         token wiring based on the admin join response.
 * 6. Assertions and validation
 *
 *    - Use `typia.assert(...)` for all successful responses with concrete DTO return
 *         types (admin join, policy create, cancellation policy create, refund
 *         policy create, region create) to guarantee type safety.
 *    - Use `TestValidator.error` with a clear title string to verify that the
 *         unknown-code lookup fails.
 */
export async function test_api_platform_admin_shipping_zone_setting_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Join as a new platform administrator so that subsequent calls
  //    are authenticated as platformAdmin.
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create background configuration entities so that the platform
  //    environment is realistic (non-empty) but does not define any
  //    shipping zone for the sentinel code.

  // 2-1. Create a policy setting profile.
  const policyBody = typia.random<IShoppingMallPolicySetting.ICreate>();
  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policyBody },
    );
  typia.assert(policySetting);

  // 2-2. Create a region setting.
  const regionBody = typia.random<IShoppingMallRegionSetting.ICreate>();
  const regionSetting: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBody },
    );
  typia.assert(regionSetting);

  // 2-3. Create a cancellation policy, optionally referencing the
  //       above policy and region by business codes when fields exist
  //       in the ICreate DTO. We use a fresh random ICreate payload so
  //       we do not accidentally collide with the sentinel code.
  const cancellationBody =
    typia.random<IShoppingMallCancellationPolicy.ICreate>();
  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationBody },
    );
  typia.assert(cancellationPolicy);

  // 2-4. Create a refund policy, also with a random business code.
  const refundBody = typia.random<IShoppingMallRefundPolicy.ICreate>();
  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundBody },
    );
  typia.assert(refundPolicy);

  // 3. Define a clearly non-existent shipping zone code. We deliberately
  //    choose a constant sentinel string that should never be generated
  //    by random generators and has not been used above.
  const unknownShippingZoneCode = "__E2E_UNKNOWN_SHIPPING_ZONE_CODE__";

  // 4. Attempt to load the shipping zone settings for the unknown code
  //    and assert that an error is thrown. We do not verify specific
  //    HTTP status codes or error payload structure, in line with
  //    framework constraints.
  await TestValidator.error(
    "requesting shipping zone setting with unknown code should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.at(
        connection,
        { shippingZoneCode: unknownShippingZoneCode },
      );
    },
  );
}
