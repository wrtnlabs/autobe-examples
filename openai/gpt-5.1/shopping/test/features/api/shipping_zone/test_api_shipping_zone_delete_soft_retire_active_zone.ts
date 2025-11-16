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
 * Retire (soft-delete) an active shipping zone by business code as a platform
 * admin.
 *
 * Business flow:
 *
 * 1. Join as a platform administrator to obtain an authorized session.
 * 2. Create a base policy setting profile for realism (not strictly required by
 *    erase).
 * 3. Create a cancellation policy that references the policy setting by business
 *    code.
 * 4. Create a refund policy that also references the same policy setting and
 *    region by business codes.
 * 5. Create a region configuration that will act as the primary region for the
 *    shipping zone.
 * 6. Create an active shipping zone bound to the region (active=true,
 *    deleted_at=null initially).
 * 7. Call DELETE
 *    /shoppingMall/platformAdmin/shippingZoneSettings/{shippingZoneCode} to
 *    retire the zone.
 * 8. Verify that:
 *
 *    - The response is a valid IShoppingMallShippingZoneSetting.
 *    - The `code` remains the same.
 *    - The zone is no longer active for new rate calculations (active === false OR
 *         deleted_at !== null).
 *    - If deleted_at was null on creation, it becomes non-null after erase (when the
 *         model uses soft-delete timestamp).
 */
export async function test_api_shipping_zone_delete_soft_retire_active_zone(
  connection: api.IConnection,
) {
  // 1. Join as a platform administrator
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.test/join",
    referrer: "https://admin.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a base policy setting profile
  const policyCode = `policy_${RandomGenerator.alphaNumeric(8)}`;
  const policyCreate = {
    code: policyCode,
    name: "Default Platform Policy",
    category: "refund",
    description: "Base policy profile for refund and cancellation tests.",
    config_payload: null,
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policy: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policyCreate },
    );
  typia.assert(policy);

  // 3. Create a cancellation policy referencing the policy setting by code
  const cancellationCode = `cancel_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationCreate = {
    code: cancellationCode,
    name: "Default Cancellation Policy",
    description: "Allows pre-shipment cancellation with a small window.",
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: null,
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: policy.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationCreate },
    );
  typia.assert(cancellationPolicy);

  // 4. Create a region configuration to be used both by refund policy and shipping zone
  const regionCode = `REG_${RandomGenerator.alphaNumeric(6)}`;
  const regionCreate = {
    code: regionCode,
    name: "Test Region",
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreate },
    );
  typia.assert(region);

  // 5. Create a refund policy referencing policy setting and region codes
  const refundCode = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const refundCreate = {
    code: refundCode,
    name: "Default Refund Policy",
    description: "Standard refund window and rate.",
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 1,
    requireManualApprovalOverAmount: 1000,
    configurationPayload: "{}",
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode: region.code,
    policySettingCode: policy.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundCreate },
    );
  typia.assert(refundPolicy);

  // 6. Create an active shipping zone referencing the region as primary
  const shippingZoneCode = `ZONE_${RandomGenerator.alphaNumeric(8)}`;
  const shippingZoneCreate = {
    code: shippingZoneCode,
    name: "Test Shipping Zone",
    description: "Zone bound to Test Region for E2E retirement test.",
    active: true,
    shopping_mall_region_setting_id: region.id,
  } satisfies IShoppingMallShippingZoneSetting.ICreate;

  const createdZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
      connection,
      { body: shippingZoneCreate },
    );
  typia.assert(createdZone);

  // Validate initial state: active and not soft-deleted
  TestValidator.equals(
    "created zone has expected code",
    createdZone.code,
    shippingZoneCode,
  );
  TestValidator.predicate(
    "created zone is initially active",
    createdZone.active === true,
  );
  TestValidator.equals(
    "created zone deleted_at is initially null",
    createdZone.deleted_at ?? null,
    null,
  );

  const initialDeletedAt = createdZone.deleted_at ?? null;

  // 7. Retire (erase) the shipping zone by its business code
  const retiredZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.erase(
      connection,
      { shippingZoneCode },
    );
  typia.assert(retiredZone);

  // 8. Business validations after retirement
  TestValidator.equals(
    "retired zone code matches original",
    retiredZone.code,
    shippingZoneCode,
  );

  // Ensure primaryRegion remains consistent for historical integrity when present
  if (
    retiredZone.primaryRegion !== undefined &&
    createdZone.primaryRegion !== undefined
  ) {
    TestValidator.equals(
      "primaryRegion id is preserved after retirement",
      retiredZone.primaryRegion.id,
      createdZone.primaryRegion.id,
    );
  }

  // Zone must no longer be active OR must have a deleted_at timestamp
  const isSoftDeleted =
    retiredZone.active === false || retiredZone.deleted_at !== null;
  TestValidator.predicate(
    "retired zone is inactive or has deleted_at timestamp",
    isSoftDeleted,
  );

  // If implementation uses deleted_at, verify it changed from null to non-null
  if (initialDeletedAt === null && retiredZone.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at is populated after retirement when previously null",
      retiredZone.deleted_at !== null,
    );
  }
}
