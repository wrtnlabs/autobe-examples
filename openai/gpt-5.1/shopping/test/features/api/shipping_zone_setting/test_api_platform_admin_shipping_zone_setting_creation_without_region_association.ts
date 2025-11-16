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
 * Validate creation of a shipping zone without primary region association.
 *
 * Business context: Platform administrators should be able to configure
 * shipping zones that are not tied to any specific primary region
 * configuration. This allows defining generic or future-use zones without
 * immediately wiring them to a shopping_mall_region_settings entry. When such a
 * zone is created with a null region FK, the read model
 * IShoppingMallShippingZoneSetting should expose `primaryRegion` as undefined
 * and keep all lifecycle fields consistent.
 *
 * Test steps:
 *
 * 1. Join as a new platform admin to obtain an authorized session.
 * 2. Optionally create a cancellation policy and refund policy to simulate a
 *    realistic admin configuration environment (these are not directly
 *    associated to the shipping zone but confirm that unrelated settings do not
 *    interfere).
 * 3. Create a shipping zone with:
 *
 *    - Unique business `code`
 *    - Human-readable `name`
 *    - Non-null `description`
 *    - `active` set to true
 *    - `shopping_mall_region_setting_id` explicitly set to null so there is no
 *         region association.
 * 4. Validate that the returned IShoppingMallShippingZoneSetting:
 *
 *    - Passes typia.assert (full structural and format validation)
 *    - Echoes back the same `code`, `name`, `description`, and `active` values that
 *         were sent in the create request
 *    - Has a non-empty UUID `id`
 *    - Has `primaryRegion` === undefined (because no region FK was provided)
 *    - Has `created_at` and `updated_at` set
 *    - Has `deleted_at` equal to null or undefined (not set for a fresh row).
 */
export async function test_api_platform_admin_shipping_zone_setting_creation_without_region_association(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin (auth + token setup)
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create background cancellation policy (optional realism)
  const cancellationPolicyBody = {
    code: `CANCEL_${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: null,
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: cancellationPolicyBody,
      },
    );
  typia.assert(cancellationPolicy);

  // 3. Create background refund policy (optional realism)
  const now = new Date();
  const refundPolicyBody = {
    code: `REFUND_${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1,
    requireManualApprovalOverAmount: undefined,
    configurationPayload: undefined,
    isActive: true,
    effectiveFrom: now.toISOString(),
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: null,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      {
        body: refundPolicyBody,
      },
    );
  typia.assert(refundPolicy);

  // 4. Create a shipping zone without region association
  const zoneCode = `ZONE_NO_REGION_${RandomGenerator.alphaNumeric(8)}`;
  const zoneName = "Shipping Zone Without Region";
  const zoneDescription = RandomGenerator.paragraph({ sentences: 5 });

  const shippingZoneCreateBody = {
    code: zoneCode,
    name: zoneName,
    description: zoneDescription,
    active: true,
    shopping_mall_region_setting_id: null,
  } satisfies IShoppingMallShippingZoneSetting.ICreate;

  const zone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
      connection,
      {
        body: shippingZoneCreateBody,
      },
    );
  typia.assert(zone);

  // 5. Business validations on the created zone
  TestValidator.predicate(
    "shipping zone id should be a non-empty string",
    typeof zone.id === "string" && zone.id.length > 0,
  );

  TestValidator.equals(
    "shipping zone code should echo input",
    zone.code,
    zoneCode,
  );
  TestValidator.equals(
    "shipping zone name should echo input",
    zone.name,
    zoneName,
  );
  TestValidator.equals(
    "shipping zone description should echo input",
    zone.description,
    zoneDescription,
  );
  TestValidator.equals(
    "shipping zone active should be true",
    zone.active,
    true,
  );

  TestValidator.predicate(
    "shipping zone primaryRegion should be undefined when no region FK is provided",
    zone.primaryRegion === undefined,
  );

  TestValidator.predicate(
    "shipping zone created_at should be a non-empty string",
    typeof zone.created_at === "string" && zone.created_at.length > 0,
  );
  TestValidator.predicate(
    "shipping zone updated_at should be a non-empty string",
    typeof zone.updated_at === "string" && zone.updated_at.length > 0,
  );

  TestValidator.predicate(
    "shipping zone deleted_at should be null or undefined on creation",
    zone.deleted_at === null || zone.deleted_at === undefined,
  );
}
