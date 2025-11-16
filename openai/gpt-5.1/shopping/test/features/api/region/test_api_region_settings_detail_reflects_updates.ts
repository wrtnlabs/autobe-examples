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
 * Validate that the region detail endpoint reflects updates made to an existing
 * region configuration for a platform administrator.
 *
 * Business flow
 *
 * 1. Join as a platform admin via POST /auth/platformAdmin/join to obtain an
 *    authorized admin session on the shared connection.
 * 2. Create an initial region configuration via POST
 *    /shoppingMall/platformAdmin/regionSettings with a concrete region code,
 *    name, active=true, and metadata values (iso_country_code, currency_code,
 *    timezone).
 * 3. Call GET /shoppingMall/platformAdmin/regionSettings/{regionCode} to read the
 *    region detail and validate that it matches the creation payload for all
 *    core fields (code, name, active, metadata) and captures created_at and
 *    updated_at timestamps.
 * 4. Update the same region via PUT
 *    /shoppingMall/platformAdmin/regionSettings/{regionCode}, changing name,
 *    active flag, and metadata values.
 * 5. Call GET /shoppingMall/platformAdmin/regionSettings/{regionCode} again and
 *    assert that:
 *
 *    - Id is stable across create, first GET, update, and second GET.
 *    - Code is stable and equal to the regionCode used in path and creation.
 *    - Created_at is unchanged across all responses.
 *    - Updated_at has advanced (different from the initial value, and
 *         chronologically later).
 *    - Name, active, iso_country_code, currency_code, and timezone reflect the
 *         updated values.
 */
export async function test_api_region_settings_detail_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to establish Authorization on the connection
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an initial region configuration
  const regionCode: string = "US_MARKET_" + RandomGenerator.alphaNumeric(8);
  const createBody = {
    code: regionCode,
    name: "United States Initial",
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const created: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Validate created region matches creation payload
  TestValidator.equals(
    "created.code should equal input code",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created.name should equal input name",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created.active should equal input active",
    created.active,
    createBody.active,
  );
  TestValidator.equals(
    "created.iso_country_code should equal input iso_country_code",
    created.iso_country_code ?? null,
    createBody.iso_country_code ?? null,
  );
  TestValidator.equals(
    "created.currency_code should equal input currency_code",
    created.currency_code ?? null,
    createBody.currency_code ?? null,
  );
  TestValidator.equals(
    "created.timezone should equal input timezone",
    created.timezone ?? null,
    createBody.timezone ?? null,
  );

  const createdCreatedAt = created.created_at;
  const createdUpdatedAt = created.updated_at;

  // 3. First detail GET
  const firstDetail: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.at(
      connection,
      { regionCode },
    );
  typia.assert(firstDetail);

  TestValidator.equals(
    "detail1.id should equal created.id",
    firstDetail.id,
    created.id,
  );
  TestValidator.equals(
    "detail1.code should equal regionCode",
    firstDetail.code,
    regionCode,
  );
  TestValidator.equals(
    "detail1.created_at should equal created.created_at",
    firstDetail.created_at,
    createdCreatedAt,
  );
  TestValidator.equals(
    "detail1.updated_at should equal created.updated_at",
    firstDetail.updated_at,
    createdUpdatedAt,
  );

  // 4. Update region fields
  const updateBody = {
    name: "United States Updated",
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/Los_Angeles",
    active: false,
  } satisfies IShoppingMallRegionSetting.IUpdate;

  const updated: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.update(
      connection,
      {
        regionCode,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // Validate identity fields stability after update
  TestValidator.equals(
    "updated.id should remain same as created.id",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "updated.code should remain same as regionCode",
    updated.code,
    regionCode,
  );
  TestValidator.equals(
    "updated.created_at should remain same as initial",
    updated.created_at,
    createdCreatedAt,
  );
  TestValidator.notEquals(
    "updated.updated_at should differ from initial",
    updated.updated_at,
    createdUpdatedAt,
  );

  TestValidator.equals(
    "updated.name should equal new name",
    updated.name,
    updateBody.name,
  );
  TestValidator.equals(
    "updated.active should equal new active flag",
    updated.active,
    updateBody.active,
  );
  TestValidator.equals(
    "updated.iso_country_code should equal new iso_country_code",
    updated.iso_country_code ?? null,
    updateBody.iso_country_code ?? null,
  );
  TestValidator.equals(
    "updated.currency_code should equal new currency_code",
    updated.currency_code ?? null,
    updateBody.currency_code ?? null,
  );
  TestValidator.equals(
    "updated.timezone should equal new timezone",
    updated.timezone ?? null,
    updateBody.timezone ?? null,
  );

  // Ensure updated_at is chronologically later
  TestValidator.predicate("updated_at must be later than initial", () => {
    const before = new Date(createdUpdatedAt).getTime();
    const after = new Date(updated.updated_at).getTime();
    return after >= before;
  });

  // 5. Second detail GET and final consistency checks
  const secondDetail: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.at(
      connection,
      { regionCode },
    );
  typia.assert(secondDetail);

  TestValidator.equals(
    "detail2.id should equal created.id",
    secondDetail.id,
    created.id,
  );
  TestValidator.equals(
    "detail2.code should equal regionCode",
    secondDetail.code,
    regionCode,
  );
  TestValidator.equals(
    "detail2.created_at should equal original created_at",
    secondDetail.created_at,
    createdCreatedAt,
  );
  TestValidator.equals(
    "detail2.updated_at should equal updated.updated_at",
    secondDetail.updated_at,
    updated.updated_at,
  );
  TestValidator.equals(
    "detail2.name should equal updated name",
    secondDetail.name,
    updateBody.name,
  );
  TestValidator.equals(
    "detail2.active should equal updated active",
    secondDetail.active,
    updateBody.active,
  );
  TestValidator.equals(
    "detail2.iso_country_code should equal updated iso_country_code",
    secondDetail.iso_country_code ?? null,
    updateBody.iso_country_code ?? null,
  );
  TestValidator.equals(
    "detail2.currency_code should equal updated currency_code",
    secondDetail.currency_code ?? null,
    updateBody.currency_code ?? null,
  );
  TestValidator.equals(
    "detail2.timezone should equal updated timezone",
    secondDetail.timezone ?? null,
    updateBody.timezone ?? null,
  );
}
