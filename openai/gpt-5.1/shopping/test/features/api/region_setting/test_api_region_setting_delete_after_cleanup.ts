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

/**
 * Validate that a platform admin can delete a region configuration after
 * platform-level policy configuration has been established and that a
 * subsequent delete attempt fails, implying the region has been removed.
 *
 * Business context:
 *
 * - Region settings are global configuration records in
 *   shopping_mall_region_settings referenced by other policy models
 *   (cancellation, refund, etc.).
 * - Platform admins manage these entries through dedicated platformAdmin APIs.
 * - Deleting a region should only succeed when it is not hard-referenced by
 *   critical configuration; this test shapes data so our target region is
 *   independent and safe to delete.
 *
 * Test flow:
 *
 * 1. Join as a new platform admin using POST /auth/platformAdmin/join with
 *    IShoppingMallPlatformAdminJoin.IRequest. Rely on the SDK to bind the
 *    resulting JWT token into the connection headers.
 * 2. Create a generic policy setting profile via POST
 *    /shoppingMall/platformAdmin/policySettings using
 *    IShoppingMallPolicySetting.ICreate. We only need it to exist; no later
 *    logic depends on its exact contents.
 * 3. Create a cancellation policy via POST
 *    /shoppingMall/platformAdmin/cancellationPolicies using
 *    IShoppingMallCancellationPolicy.ICreate. Ensure its region_code is null so
 *    it does not reference the region we will delete.
 * 4. Create a refund policy via POST /shoppingMall/platformAdmin/refundPolicies
 *    using IShoppingMallRefundPolicy.ICreate. For the same reason, either omit
 *    or set regionCode to a different value than the region we plan to delete.
 * 5. Create a region setting via POST /shoppingMall/platformAdmin/regionSettings
 *    using IShoppingMallRegionSetting.ICreate, with a unique `code` (business
 *    region code) and basic attributes like `name`, `active`, and optional
 *    country/currency/timezone metadata.
 * 6. Assert via typia.assert that the created region matches
 *    IShoppingMallRegionSetting and that its `code` is the one we provided.
 * 7. Call DELETE /shoppingMall/platformAdmin/regionSettings/{regionCode} through
 *    api.functional.shoppingMall.platformAdmin.regionSettings.erase, passing
 *    the created region's `code`. If this call completes without throwing, we
 *    treat it as a successful deletion.
 * 8. Call the same erase endpoint again for the same `regionCode`, but this time
 *    wrap it in TestValidator.error to assert that a second deletion attempt
 *    fails. This serves as indirect evidence that the region has already been
 *    removed.
 *
 * Important notes:
 *
 * - We do not attempt to read the region after deletion because no GET endpoint
 *   is provided in the SDK. Instead, we rely on the failure of a double-delete
 *   as the deletion signal.
 * - We do not test specific HTTP status codes or error structures and only assert
 *   that an error occurs on the second erase.
 * - All request bodies are constructed to satisfy their DTOs using the
 *   `satisfies` operator, and all non-void responses are verified with
 *   typia.assert for runtime type safety.
 */
export async function test_api_region_setting_delete_after_cleanup(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain an authorized connection
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create a generic policy setting profile
  const policySettingCode = `policy_${RandomGenerator.alphaNumeric(8)}`;
  const policySettingBody = {
    code: policySettingCode,
    name: "Default Cancellation/Refund Profile",
    category: "generic",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingBody },
    );
  typia.assert<IShoppingMallPolicySetting>(policySetting);
  TestValidator.equals(
    "created policy setting code should match request",
    policySetting.code,
    policySettingCode,
  );

  // 3. Create a cancellation policy not bound to the region under test
  const cancellationPolicyCode = `cancel_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationBody = {
    code: cancellationPolicyCode,
    name: "Global Cancellation Policy (no region)",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 72,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationBody },
    );
  typia.assert<IShoppingMallCancellationPolicy>(cancellationPolicy);
  TestValidator.equals(
    "created cancellation policy code should match request",
    cancellationPolicy.code,
    cancellationPolicyCode,
  );

  // 4. Create a refund policy scoped to another region code (not the one to delete)
  const otherRegionCode = `OTHER_${RandomGenerator.alphaNumeric(6)}`;
  const refundPolicyCode = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const refundPolicyBody = {
    code: refundPolicyCode,
    name: "Refund Policy for Other Region",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: otherRegionCode,
    policySettingCode: policySettingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyBody },
    );
  typia.assert<IShoppingMallRefundPolicy>(refundPolicy);
  TestValidator.equals(
    "created refund policy code should match request",
    refundPolicy.code,
    refundPolicyCode,
  );

  // 5. Create the region setting that will be deleted
  const regionCode = `REGION_${RandomGenerator.alphaNumeric(6)}`;
  const regionBody = {
    code: regionCode,
    name: "Temporary Test Region",
    iso_country_code: "ZZ",
    currency_code: "USD",
    timezone: "Etc/UTC",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBody },
    );
  typia.assert<IShoppingMallRegionSetting>(region);
  TestValidator.equals(
    "created region code should match request",
    region.code,
    regionCode,
  );

  // 6. Delete the created region
  await api.functional.shoppingMall.platformAdmin.regionSettings.erase(
    connection,
    { regionCode },
  );

  // 7. Second delete attempt must fail, implying region is already removed
  await TestValidator.error(
    "double deletion of region should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.regionSettings.erase(
        connection,
        { regionCode },
      );
    },
  );
}
