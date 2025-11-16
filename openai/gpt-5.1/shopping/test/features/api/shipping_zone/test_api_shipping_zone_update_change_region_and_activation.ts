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
 * Update an existing shipping zone to a new primary region and toggle
 * activation.
 *
 * Business flow:
 *
 * 1. Register a new platform admin (auth join) to obtain an authorized connection
 *    context.
 * 2. Create a baseline policy setting profile (not strictly required for shipping
 *    zone, but matches scenario dependencies).
 * 3. Create a cancellation policy bound to that policy setting (conceptual
 *    dependency only).
 * 4. Create a refund policy referencing the same policy setting code (conceptual
 *    dependency only).
 * 5. Create Region A (initial primary region for the shipping zone).
 * 6. Create Region B (target primary region after update).
 * 7. Create a shipping zone with a stable business code mapped to Region A and
 *    active=true.
 * 8. Update that shipping zone by its business code to point to Region B, change
 *    its name/description, and set active=false.
 * 9. Verify id and code remain stable, primaryRegion switches to Region B, active
 *    flag changes to false, and updated_at changes while created_at stays the
 *    same.
 */
export async function test_api_shipping_zone_update_change_region_and_activation(
  connection: api.IConnection,
) {
  // 1. Join platform admin (authorization context)
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
  typia.assert(admin);

  // 2. Create policy setting profile
  const policyCode = `policy_${RandomGenerator.alphaNumeric(8)}`;
  const policyCreate = {
    code: policyCode,
    name: "Default Refund/Cancellation Policy Setting",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: JSON.stringify({ version: 1, kind: "baseline" }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: policyCreate,
      },
    );
  typia.assert(policySetting);

  // 3. Create cancellation policy
  const cancellationCode = `cancel_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationCreate = {
    code: cancellationCode,
    name: "Standard Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 48,
    config_payload: JSON.stringify({ windowHours: 48 }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationCreate },
    );
  typia.assert(cancellationPolicy);

  // 4. Create refund policy
  const refundCode = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const refundCreate = {
    code: refundCode,
    name: "Standard Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: JSON.stringify({ type: "standard", days: 30 }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundCreate },
    );
  typia.assert(refundPolicy);

  // 5. Create Region A
  const regionACode = `REGION_A_${RandomGenerator.alphaNumeric(6)}`;
  const regionACreate = {
    code: regionACode,
    name: "Region A",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const regionA: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionACreate },
    );
  typia.assert(regionA);

  // 6. Create Region B
  const regionBCode = `REGION_B_${RandomGenerator.alphaNumeric(6)}`;
  const regionBCreate = {
    code: regionBCode,
    name: "Region B",
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const regionB: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBCreate },
    );
  typia.assert(regionB);

  // 7. Create initial shipping zone mapped to Region A
  const shippingZoneCode = "DOMESTIC";
  const zoneCreate = {
    code: shippingZoneCode,
    name: "Domestic Shipping Zone (Region A)",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    shopping_mall_region_setting_id: regionA.id,
  } satisfies IShoppingMallShippingZoneSetting.ICreate;

  const createdZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
      connection,
      { body: zoneCreate },
    );
  typia.assert(createdZone);

  TestValidator.equals(
    "created zone code should match request code",
    createdZone.code,
    shippingZoneCode,
  );
  TestValidator.predicate(
    "created zone should be active",
    createdZone.active === true,
  );
  TestValidator.predicate(
    "created zone primaryRegion should be Region A",
    createdZone.primaryRegion !== undefined &&
      createdZone.primaryRegion.id === regionA.id &&
      createdZone.primaryRegion.code === regionA.code,
  );

  const originalId = createdZone.id;
  const originalCode = createdZone.code;
  const originalCreatedAt = createdZone.created_at;
  const originalUpdatedAt = createdZone.updated_at;

  // 8. Update shipping zone to Region B and deactivate
  const updatedName = "Domestic Shipping Zone (Region B)";
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });

  const updateBody = {
    name: updatedName,
    description: updatedDescription,
    active: false,
    shopping_mall_region_setting_id: regionB.id,
  } satisfies IShoppingMallShippingZoneSetting.IUpdate;

  const updatedZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.update(
      connection,
      {
        shippingZoneCode: originalCode,
        body: updateBody,
      },
    );
  typia.assert(updatedZone);

  // 9. Business validations
  TestValidator.equals(
    "shipping zone id should remain unchanged after update",
    updatedZone.id,
    originalId,
  );
  TestValidator.equals(
    "shipping zone code should remain unchanged after update",
    updatedZone.code,
    originalCode,
  );
  TestValidator.equals(
    "shipping zone name should be updated",
    updatedZone.name,
    updatedName,
  );
  TestValidator.equals(
    "shipping zone description should be updated",
    updatedZone.description,
    updatedDescription,
  );
  TestValidator.predicate(
    "shipping zone active flag should be false after update",
    updatedZone.active === false,
  );
  TestValidator.predicate(
    "shipping zone primaryRegion should switch to Region B",
    updatedZone.primaryRegion !== undefined &&
      updatedZone.primaryRegion.id === regionB.id &&
      updatedZone.primaryRegion.code === regionB.code,
  );

  TestValidator.equals(
    "created_at timestamp should remain the same after update",
    updatedZone.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change after update",
    updatedZone.updated_at,
    originalUpdatedAt,
  );
}
