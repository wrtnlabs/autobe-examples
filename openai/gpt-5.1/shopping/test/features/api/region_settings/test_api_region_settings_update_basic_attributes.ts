import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

export async function test_api_region_settings_update_basic_attributes(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (also sets Authorization header on connection)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create initial region setting
  const initialCode = RandomGenerator.alphaNumeric(8);
  const initialName = RandomGenerator.paragraph({ sentences: 2 });
  const initialIsoCountry = "US";
  const initialCurrency = "USD";
  const initialTimezone = "America/New_York";

  const createBody = {
    code: initialCode,
    name: initialName,
    iso_country_code: initialIsoCountry,
    currency_code: initialCurrency,
    timezone: initialTimezone,
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const created =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallRegionSetting>(created);

  // 3. Update region basic attributes by business code
  const newName = RandomGenerator.paragraph({ sentences: 3 });
  const newTimezone = "Asia/Seoul";

  const updateBody = {
    name: newName,
    // Omit iso_country_code to keep it unchanged
    currency_code: null,
    timezone: newTimezone,
    active: false,
  } satisfies IShoppingMallRegionSetting.IUpdate;

  const updated =
    await api.functional.shoppingMall.platformAdmin.regionSettings.update(
      connection,
      {
        regionCode: created.code,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallRegionSetting>(updated);

  // 4. Validate identifiers remain stable
  TestValidator.equals(
    "region id should remain the same after update",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "region code should remain the same after update",
    updated.code,
    created.code,
  );

  // 5. Validate updated business fields
  TestValidator.equals("region name should be updated", updated.name, newName);
  TestValidator.notEquals(
    "region name should differ from original",
    updated.name,
    created.name,
  );

  TestValidator.equals(
    "active flag should be toggled to false",
    updated.active,
    false,
  );

  TestValidator.equals(
    "timezone should be updated to new value",
    updated.timezone,
    newTimezone,
  );

  TestValidator.equals(
    "currency_code should be nullified by update",
    updated.currency_code,
    null,
  );

  TestValidator.equals(
    "iso_country_code should remain unchanged when omitted from update body",
    updated.iso_country_code,
    created.iso_country_code,
  );

  // 6. Validate timestamps
  TestValidator.predicate(
    "created_at should remain unchanged",
    updated.created_at === created.created_at,
  );

  TestValidator.predicate(
    "updated_at should be later than or equal to original updated_at",
    new Date(updated.updated_at).getTime() >=
      new Date(created.updated_at).getTime(),
  );

  TestValidator.predicate(
    "updated_at should be later than or equal to created_at",
    new Date(updated.updated_at).getTime() >=
      new Date(created.created_at).getTime(),
  );

  TestValidator.equals(
    "deleted_at should remain null after normal update",
    updated.deleted_at,
    null,
  );
}
