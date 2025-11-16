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
 * Validate that a platform admin can create a shipping zone setting associated
 * with an existing region configuration.
 *
 * Business flow:
 *
 * 1. Join as a platform admin to obtain authorized context.
 * 2. Create a sample cancellation policy (environment realism only).
 * 3. Create a sample refund policy (environment realism only).
 * 4. Create a primary region setting.
 * 5. Create a shipping zone setting that references the region by
 *    shopping_mall_region_setting_id and is marked active.
 * 6. Verify that the created zone echoes core fields and exposes primaryRegion
 *    summary matching the created region, and that lifecycle timestamps are
 *    populated while deleted_at is null.
 */
export async function test_api_platform_admin_shipping_zone_setting_creation_with_region_association(
  connection: api.IConnection,
) {
  // 1. Register / authenticate platform admin
  const adminJoinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a sample cancellation policy (not directly used later)
  const cancellationCreateBody =
    typia.random<IShoppingMallCancellationPolicy.ICreate>();
  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: cancellationCreateBody,
      },
    );
  typia.assert(cancellationPolicy);

  // 3. Create a sample refund policy (not directly used later)
  const refundCreateBody = typia.random<IShoppingMallRefundPolicy.ICreate>();
  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      {
        body: refundCreateBody,
      },
    );
  typia.assert(refundPolicy);

  // 4. Create a primary region setting
  const regionCreateBody: IShoppingMallRegionSetting.ICreate = {
    ...typia.random<IShoppingMallRegionSetting.ICreate>(),
    active: true,
  };
  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 5. Create a shipping zone setting associated with the region
  const zoneCode = `ZONE_${RandomGenerator.alphaNumeric(8)}`;
  const zoneName = RandomGenerator.paragraph({ sentences: 2 });
  const zoneDescription = RandomGenerator.paragraph({ sentences: 4 });

  const shippingZoneCreateBody: IShoppingMallShippingZoneSetting.ICreate = {
    code: zoneCode,
    name: zoneName,
    description: zoneDescription,
    active: true,
    shopping_mall_region_setting_id: region.id,
  };

  const zone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
      connection,
      {
        body: shippingZoneCreateBody,
      },
    );
  typia.assert(zone);

  // 6. Business-level validations
  // 6-1. id is a non-empty UUID (typia has already structurally validated it)
  TestValidator.predicate(
    "shipping zone id should be non-empty",
    zone.id.length > 0,
  );

  // 6-2. Core echo fields
  TestValidator.equals(
    "shipping zone code should match input",
    zone.code,
    zoneCode,
  );
  TestValidator.equals(
    "shipping zone name should match input",
    zone.name,
    zoneName,
  );
  TestValidator.equals(
    "shipping zone description should match input",
    zone.description,
    zoneDescription,
  );
  TestValidator.equals(
    "shipping zone active flag should be true",
    zone.active,
    true,
  );

  // 6-3. primaryRegion summary should be present and match the region
  TestValidator.predicate(
    "primaryRegion summary should be present on created zone",
    zone.primaryRegion !== undefined && zone.primaryRegion !== null,
  );

  if (zone.primaryRegion !== undefined && zone.primaryRegion !== null) {
    TestValidator.equals(
      "primaryRegion.id should match created region id",
      zone.primaryRegion.id,
      region.id,
    );
    TestValidator.equals(
      "primaryRegion.code should match created region code",
      zone.primaryRegion.code,
      region.code,
    );
    TestValidator.equals(
      "primaryRegion.name should match created region name",
      zone.primaryRegion.name,
      region.name,
    );
    TestValidator.equals(
      "primaryRegion.active should match created region active",
      zone.primaryRegion.active,
      region.active,
    );
  }

  // 6-4. Lifecycle timestamps: created_at and updated_at are populated
  TestValidator.predicate(
    "shipping zone created_at should be non-empty",
    zone.created_at.length > 0,
  );
  TestValidator.predicate(
    "shipping zone updated_at should be non-empty",
    zone.updated_at.length > 0,
  );

  // 6-5. deleted_at should be null or undefined for a newly created zone
  TestValidator.predicate(
    "shipping zone deleted_at should be null or undefined on creation",
    zone.deleted_at === null || zone.deleted_at === undefined,
  );
}
