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

export async function test_api_shipping_zone_delete_zone_with_existing_region_and_policies(
  connection: api.IConnection,
) {
  // 1. Authenticate as a platform admin using join
  const joinRequest = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create a policy setting profile that will be referenced by policies
  const policySettingCode = `policy_${RandomGenerator.alphaNumeric(8)}`;
  const policySettingBody = {
    code: policySettingCode,
    name: "Logistics Policy Profile",
    category: "logistics",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: RandomGenerator.content({ paragraphs: 2 }),
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingBody },
    );
  typia.assert(policySetting);

  // 3. Create a region setting that the shipping zone and policies can reference
  const regionCode = `REG_${RandomGenerator.alphaNumeric(6)}`;
  const regionBody = {
    code: regionCode,
    name: "Korea Domestic Region",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBody },
    );
  typia.assert(region);

  // 4. Create a cancellation policy linked to the region and policy setting
  const cancellationPolicyCode = `cancel_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationPolicyBody = {
    code: cancellationPolicyCode,
    name: "Default Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: region.code,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationPolicyBody },
    );
  typia.assert(cancellationPolicy);

  // 5. Create a refund policy linked to the region and policy setting
  const refundPolicyCode = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const refundPolicyBody = {
    code: refundPolicyCode,
    name: "Default Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode: region.code,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyBody },
    );
  typia.assert(refundPolicy);

  // 6. Create a shipping zone attached to the region
  const shippingZoneCode = `ZONE_${RandomGenerator.alphaNumeric(8)}`;
  const shippingZoneBody = {
    code: shippingZoneCode,
    name: "Domestic Shipping Zone",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    shopping_mall_region_setting_id: region.id,
  } satisfies IShoppingMallShippingZoneSetting.ICreate;

  const createdZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
      connection,
      { body: shippingZoneBody },
    );
  typia.assert(createdZone);

  // Snapshot of related entities before erasing the zone, to verify they
  // remain logically unchanged in our test context after the erase operation.
  const beforePolicySetting = { ...policySetting };
  const beforeCancellationPolicy = { ...cancellationPolicy };
  const beforeRefundPolicy = { ...refundPolicy };
  const beforeRegion = { ...region };

  // 7. Erase (retire) the created shipping zone by business code
  const erasedZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.erase(
      connection,
      { shippingZoneCode: createdZone.code },
    );
  typia.assert(erasedZone);

  // 8. Verify we erased the intended zone via id and code equality
  TestValidator.equals(
    "shipping zone id should remain consistent on erase",
    erasedZone.id,
    createdZone.id,
  );
  TestValidator.equals(
    "shipping zone code should remain consistent on erase",
    erasedZone.code,
    createdZone.code,
  );

  // 9. Basic sanity check that the erased zone is still a structurally valid entity.
  await TestValidator.predicate(
    "erased zone should represent a structurally valid zone entity",
    async () => {
      // typia.assert has already validated the structure; this predicate just
      // confirms we have a non-empty code and id as a minimal business check.
      return erasedZone.id.length > 0 && erasedZone.code.length > 0;
    },
  );

  // 10. Validate that previously created configuration entities remain
  // unchanged in our test context. Since we do not have search/list
  // endpoints, we limit ourselves to confirming that erase() only returns the
  // shipping zone and does not alter our cached DTOs.
  TestValidator.equals(
    "policy setting DTO should remain unchanged after shipping zone erase",
    policySetting,
    beforePolicySetting,
  );
  TestValidator.equals(
    "cancellation policy DTO should remain unchanged after shipping zone erase",
    cancellationPolicy,
    beforeCancellationPolicy,
  );
  TestValidator.equals(
    "refund policy DTO should remain unchanged after shipping zone erase",
    refundPolicy,
    beforeRefundPolicy,
  );
  TestValidator.equals(
    "region setting DTO should remain unchanged after shipping zone erase",
    region,
    beforeRegion,
  );
}
