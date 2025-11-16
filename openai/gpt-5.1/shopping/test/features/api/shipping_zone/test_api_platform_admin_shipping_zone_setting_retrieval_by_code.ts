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

export async function test_api_platform_admin_shipping_zone_setting_retrieval_by_code(
  connection: api.IConnection,
) {
  // 1. Register a fresh platform administrator so that connection carries admin Authorization
  const adminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(admin);

  // 2. Create a reusable policy setting profile
  const policyCode = `policy_${RandomGenerator.alphaNumeric(8)}`;
  const policyCreateBody = {
    code: policyCode,
    name: "Default Refund Policy Profile",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert(policySetting);

  // 3. Create a cancellation policy referencing the policy setting by code
  const cancellationPolicyCode = `cancel_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationCreateBody = {
    code: cancellationPolicyCode,
    name: "Standard Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 72,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: policyCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: cancellationCreateBody,
      },
    );
  typia.assert(cancellationPolicy);

  // 4. Create a refund policy that may also reference the policy setting and optionally a region
  const refundPolicyCode = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const refundCreateBody = {
    code: refundPolicyCode,
    name: "Standard Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1,
    requireManualApprovalOverAmount: undefined,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: policyCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      {
        body: refundCreateBody,
      },
    );
  typia.assert(refundPolicy);

  // 5. Create a primary region configuration
  const regionCode = `REGION_${RandomGenerator.alphaNumeric(6)}`;
  const regionCreateBody = {
    code: regionCode,
    name: "Primary Test Region",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 6. Create a shipping zone associated to the region
  const shippingZoneCode = `ZONE_${RandomGenerator.alphaNumeric(6)}`;
  const shippingZoneName = "Primary Region Shipping Zone";
  const shippingZoneDescription = RandomGenerator.paragraph({ sentences: 2 });

  const shippingZoneCreateBody = {
    code: shippingZoneCode,
    name: shippingZoneName,
    description: shippingZoneDescription,
    active: true,
    shopping_mall_region_setting_id: region.id,
  } satisfies IShoppingMallShippingZoneSetting.ICreate;

  const createdZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
      connection,
      {
        body: shippingZoneCreateBody,
      },
    );
  typia.assert(createdZone);

  // Sanity checks on the created zone
  TestValidator.equals(
    "created shipping zone code should match request",
    createdZone.code,
    shippingZoneCode,
  );
  TestValidator.equals(
    "created shipping zone name should match request",
    createdZone.name,
    shippingZoneName,
  );
  TestValidator.equals(
    "created shipping zone description should match request",
    createdZone.description ?? null,
    shippingZoneDescription,
  );
  TestValidator.predicate(
    "created shipping zone should be active",
    createdZone.active === true,
  );

  // 7. Retrieve the shipping zone by code using GET endpoint under test
  const fetchedZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.at(
      connection,
      {
        shippingZoneCode,
      },
    );
  typia.assert(fetchedZone);

  // 8. Validate that fetched configuration matches what was created
  TestValidator.equals(
    "fetched shipping zone code matches created code",
    fetchedZone.code,
    shippingZoneCode,
  );
  TestValidator.equals(
    "fetched shipping zone name matches created name",
    fetchedZone.name,
    shippingZoneName,
  );
  TestValidator.equals(
    "fetched shipping zone description matches created description",
    fetchedZone.description ?? null,
    shippingZoneDescription,
  );
  TestValidator.predicate(
    "fetched shipping zone is active",
    fetchedZone.active === true,
  );

  // primaryRegion summary must match the region created in step 5
  TestValidator.predicate(
    "fetched shipping zone has primaryRegion summary",
    fetchedZone.primaryRegion !== undefined,
  );

  if (fetchedZone.primaryRegion !== undefined) {
    TestValidator.equals(
      "primaryRegion.code matches region.code",
      fetchedZone.primaryRegion.code,
      region.code,
    );
    TestValidator.equals(
      "primaryRegion.name matches region.name",
      fetchedZone.primaryRegion.name,
      region.name,
    );
    TestValidator.equals(
      "primaryRegion.active matches region.active",
      fetchedZone.primaryRegion.active,
      region.active,
    );
  }

  // Ensure the zone is not soft-deleted and has timestamps populated
  TestValidator.equals(
    "fetched shipping zone deleted_at is null for active zone",
    fetchedZone.deleted_at ?? null,
    null,
  );
  TestValidator.predicate(
    "fetched shipping zone created_at is non-empty",
    fetchedZone.created_at.length > 0,
  );
  TestValidator.predicate(
    "fetched shipping zone updated_at is non-empty",
    fetchedZone.updated_at.length > 0,
  );
}
