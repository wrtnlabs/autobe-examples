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
 * Validate that retired (soft-deleted) shipping zone settings are no longer
 * visible via the platform admin GET endpoint, while active zones remain
 * retrievable.
 *
 * Business workflow validated by this test:
 *
 * 1. Register and authenticate a new platform admin via join.
 * 2. Create prerequisite configuration: policy setting, region setting,
 *    cancellation policy, and refund policy.
 * 3. Create an active shipping zone bound to the created region.
 * 4. Confirm that GET /shoppingMall/platformAdmin/shippingZoneSettings/{code}
 *    returns the active zone.
 * 5. Retire the shipping zone via DELETE on the same business code.
 * 6. Verify that subsequent GET for the retired code fails (any error), proving
 *    that soft-deleted/retired zones are excluded from reads.
 * 7. Create a second active shipping zone and confirm it remains visible via GET,
 *    ensuring that only retired zones are hidden while active ones are still
 *    accessible.
 */
export async function test_api_platform_admin_shipping_zone_setting_visibility_excludes_soft_deleted(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin (auto-auth handled by SDK)
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create prerequisite configuration objects
  // 2-1. Policy setting profile
  const policyCreateBody = typia.random<IShoppingMallPolicySetting.ICreate>();
  const policy: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policyCreateBody },
    );
  typia.assert(policy);

  // 2-2. Region setting
  const regionCreateBody = typia.random<IShoppingMallRegionSetting.ICreate>();
  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreateBody },
    );
  typia.assert(region);

  // 2-3. Cancellation policy bound to region/policy by their business codes
  const cancellationCreateBody = {
    ...typia.random<IShoppingMallCancellationPolicy.ICreate>(),
    region_code: region.code,
    policy_setting_code: policy.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;
  const cancellation: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationCreateBody },
    );
  typia.assert(cancellation);

  // 2-4. Refund policy bound to region/policy by their business codes
  const refundCreateBody = {
    ...typia.random<IShoppingMallRefundPolicy.ICreate>(),
    regionCode: region.code,
    policySettingCode: policy.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;
  const refund: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundCreateBody },
    );
  typia.assert(refund);

  // 3. Create an active shipping zone associated with the region
  const shippingZoneCode = `SZ_${RandomGenerator.alphaNumeric(12)}`;
  const shippingZoneCreateBody = {
    code: shippingZoneCode,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    active: true,
    shopping_mall_region_setting_id: region.id,
  } satisfies IShoppingMallShippingZoneSetting.ICreate;
  const shippingZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
      connection,
      { body: shippingZoneCreateBody },
    );
  typia.assert(shippingZone);

  TestValidator.equals(
    "created shipping zone code matches request code",
    shippingZone.code,
    shippingZoneCode,
  );

  // 4. Verify GET returns the newly created active zone
  const fetchedBeforeDelete: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.at(
      connection,
      { shippingZoneCode },
    );
  typia.assert(fetchedBeforeDelete);
  TestValidator.equals(
    "fetched-before-delete shipping zone code matches",
    fetchedBeforeDelete.code,
    shippingZoneCode,
  );

  // 5. Retire the zone via DELETE /shippingZoneSettings/{shippingZoneCode}
  const retired: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.erase(
      connection,
      { shippingZoneCode },
    );
  typia.assert(retired);

  // 6. After retirement, GET on same code should fail (zone is hidden / not found)
  await TestValidator.error(
    "soft-deleted (retired) shipping zone should not be fetchable by GET",
    async () => {
      await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.at(
        connection,
        { shippingZoneCode },
      );
    },
  );

  // 7. Create another active shipping zone to ensure active ones are still visible
  const secondShippingZoneCode = `SZ_${RandomGenerator.alphaNumeric(12)}`;
  const secondShippingZoneCreateBody = {
    code: secondShippingZoneCode,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    active: true,
    shopping_mall_region_setting_id: region.id,
  } satisfies IShoppingMallShippingZoneSetting.ICreate;
  const secondZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
      connection,
      { body: secondShippingZoneCreateBody },
    );
  typia.assert(secondZone);

  const fetchedSecond: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.at(
      connection,
      { shippingZoneCode: secondShippingZoneCode },
    );
  typia.assert(fetchedSecond);
  TestValidator.equals(
    "second active shipping zone remains visible via GET",
    fetchedSecond.code,
    secondShippingZoneCode,
  );
}
