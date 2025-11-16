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
 * Validate region configuration detail retrieval by business region code.
 *
 * ## Business goal
 *
 * Ensure that a platform administrator can:
 *
 * 1. Join the system and obtain an authorized admin session.
 * 2. Create a reusable policy setting profile.
 * 3. Create a concrete region configuration with business metadata (code, name,
 *    iso_country_code, currency_code, timezone, active).
 * 4. Optionally define cancellation and refund policies that reference the same
 *    region and policy setting for realistic configuration context.
 * 5. Retrieve the region configuration via GET
 *    /shoppingMall/platformAdmin/regionSettings/{regionCode} using the business
 *    region code and verify that the returned data matches what was created.
 * 6. Confirm that repeated GET calls are idempotent and do not mutate the region
 *    state.
 *
 * ## Scope and non-goals
 *
 * - We do NOT validate HTTP status codes explicitly; successful responses are
 *   assumed if the SDK call resolves.
 * - We do NOT test type errors, missing required fields, or invalid payloads. All
 *   request bodies are well-typed and complete.
 * - Region DTO does not expose explicit policy references, so policy creation is
 *   used only to mimic realistic platform configuration, not to assert
 *   cross-entity linkage on the region detail DTO.
 */
export async function test_api_region_settings_detail_retrieval_by_region_code(
  connection: api.IConnection,
) {
  // 1. Join as platform administrator to establish auth context.
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a policy setting profile to be referenced by policies.
  const policyCode = `policy_${RandomGenerator.alphaNumeric(8)}`;
  const policyCreateBody = {
    code: policyCode,
    name: "Default Global Policy Setting",
    category: "refund", // arbitrary but realistic category
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: RandomGenerator.content({ paragraphs: 2 }),
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policyCreateBody },
    );
  typia.assert(policySetting);

  // 3. Create a region configuration with unique business region code.
  const regionCode = "KR";
  const regionCreateBody = {
    code: regionCode,
    name: "Korea",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const createdRegion: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreateBody },
    );
  typia.assert(createdRegion);

  // Validate that the created region matches our expectations.
  TestValidator.equals(
    "created region code matches payload",
    createdRegion.code,
    regionCreateBody.code,
  );
  TestValidator.equals(
    "created region name matches payload",
    createdRegion.name,
    regionCreateBody.name,
  );
  TestValidator.equals(
    "created region iso_country_code matches payload",
    createdRegion.iso_country_code,
    regionCreateBody.iso_country_code,
  );
  TestValidator.equals(
    "created region currency_code matches payload",
    createdRegion.currency_code,
    regionCreateBody.currency_code,
  );
  TestValidator.equals(
    "created region timezone matches payload",
    createdRegion.timezone,
    regionCreateBody.timezone,
  );
  TestValidator.equals(
    "created region active flag matches payload",
    createdRegion.active,
    regionCreateBody.active,
  );

  // 4. Create a cancellation policy scoped to this region and policy setting.
  const cancellationCode = `cancel_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationCreateBody = {
    code: cancellationCode,
    name: "KR Global Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 72,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: regionCode,
    policy_setting_code: policyCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationCreateBody },
    );
  typia.assert(cancellationPolicy);

  // 5. Create a refund policy referencing same region and policy setting.
  const refundCode = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const refundCreateBody = {
    code: refundCode,
    name: "KR Global Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 1,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode,
    policySettingCode: policyCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundCreateBody },
    );
  typia.assert(refundPolicy);

  // 6. Retrieve the region by regionCode using GET detail endpoint.
  const fetchedRegion1: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.at(
      connection,
      { regionCode },
    );
  typia.assert(fetchedRegion1);

  // 7. Validate invariants: code, name, metadata, and active flag
  //    match the creation payload, and audit fields are present.
  TestValidator.equals(
    "fetched region code matches path parameter",
    fetchedRegion1.code,
    regionCode,
  );
  TestValidator.equals(
    "fetched region name matches creation payload",
    fetchedRegion1.name,
    regionCreateBody.name,
  );
  TestValidator.equals(
    "fetched region iso_country_code matches creation payload",
    fetchedRegion1.iso_country_code,
    regionCreateBody.iso_country_code,
  );
  TestValidator.equals(
    "fetched region currency_code matches creation payload",
    fetchedRegion1.currency_code,
    regionCreateBody.currency_code,
  );
  TestValidator.equals(
    "fetched region timezone matches creation payload",
    fetchedRegion1.timezone,
    regionCreateBody.timezone,
  );
  TestValidator.equals(
    "fetched region active flag matches creation payload",
    fetchedRegion1.active,
    regionCreateBody.active,
  );

  TestValidator.predicate(
    "fetched region created_at is non-empty string",
    fetchedRegion1.created_at.length > 0,
  );
  TestValidator.predicate(
    "fetched region updated_at is non-empty string",
    fetchedRegion1.updated_at.length > 0,
  );

  // 8. Call the GET endpoint again and ensure idempotent, stable response.
  const fetchedRegion2: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.at(
      connection,
      { regionCode },
    );
  typia.assert(fetchedRegion2);

  TestValidator.equals(
    "repeated region fetch returns identical data",
    fetchedRegion2,
    fetchedRegion1,
  );
}
