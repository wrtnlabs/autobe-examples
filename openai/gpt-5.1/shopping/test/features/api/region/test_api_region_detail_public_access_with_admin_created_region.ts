import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

export async function test_api_region_detail_public_access_with_admin_created_region(
  connection: api.IConnection,
) {
  /**
   * Validate that region details created by an administrator are exposed as
   * public, read-only reference data via the country/region detail endpoint.
   *
   * Scenario:
   *
   * 1. Register a new admin (POST /auth/admin/join) and establish admin auth.
   * 2. As the admin, create a country (POST /shoppingMall/admin/countries).
   * 3. As the same admin, create a region under that country (POST
   *    /shoppingMall/admin/countries/{countryCode}/regions).
   * 4. Using an unauthenticated connection (no Authorization header), call GET
   *    /shoppingMall/countries/{countryCode}/regions/{regionCode}.
   * 5. Assert that the response conforms to IShoppingMallRegion and that the
   *    country/region business fields match the created data, with deleted_at
   *    === null and is_active === true.
   */

  // 1. Register a new admin and obtain authorized context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Admin1234!", // any string, Format<"password"> is unconstrained
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a country as the admin
  const countryCode = RandomGenerator.alphabets(3).toUpperCase();

  const countryCreateBody = {
    country_code: countryCode,
    name_en: `Country ${RandomGenerator.name(1)}`,
    phone_code: "+82",
    is_active: true,
    sort_order: 10,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  TestValidator.equals(
    "created country_code should match request",
    country.country_code,
    countryCode,
  );
  TestValidator.equals(
    "created country is_active should be true",
    country.is_active,
    true,
  );
  TestValidator.equals(
    "created country sort_order should match request",
    country.sort_order,
    countryCreateBody.sort_order,
  );

  // 3. Create a region under the created country
  const regionCode = RandomGenerator.alphabets(5).toUpperCase();

  const regionCreateBody = {
    code: regionCode,
    name_en: `Region ${RandomGenerator.name(1)}`,
    region_type: "state",
    is_active: true,
    sort_order: 5,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  TestValidator.equals(
    "created region code should match request",
    region.code,
    regionCode,
  );
  TestValidator.equals(
    "created region name_en should match request",
    region.name_en,
    regionCreateBody.name_en,
  );
  TestValidator.equals(
    "created region is_active should be true",
    region.is_active,
    true,
  );
  TestValidator.equals(
    "created region sort_order should match request",
    region.sort_order,
    regionCreateBody.sort_order,
  );
  TestValidator.equals(
    "created region deleted_at should be null or undefined",
    region.deleted_at ?? null,
    null,
  );

  // 4. Build an unauthenticated connection (no Authorization header)
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Retrieve region detail publicly
  const publicRegion: IShoppingMallRegion =
    await api.functional.shoppingMall.countries.regions.at(publicConnection, {
      countryCode: country.country_code,
      regionCode: region.code,
    });
  typia.assert<IShoppingMallRegion>(publicRegion);

  // Validate that the public response matches the created region and country
  TestValidator.equals(
    "public region id should match created region id",
    publicRegion.id,
    region.id,
  );
  TestValidator.equals(
    "public region code should match created region code",
    publicRegion.code,
    region.code,
  );
  TestValidator.equals(
    "public region name_en should match created region name_en",
    publicRegion.name_en,
    region.name_en,
  );
  TestValidator.equals(
    "public region is_active should be true",
    publicRegion.is_active,
    true,
  );
  TestValidator.equals(
    "public region sort_order should match created region sort_order",
    publicRegion.sort_order,
    region.sort_order,
  );
  TestValidator.equals(
    "public region deleted_at should be null or undefined",
    publicRegion.deleted_at ?? null,
    null,
  );

  // Validate embedded country summary
  TestValidator.equals(
    "public region country.id should match created country id",
    publicRegion.country.id,
    country.id,
  );
  TestValidator.equals(
    "public region country_code should match created country_code",
    publicRegion.country.country_code,
    country.country_code,
  );
  TestValidator.equals(
    "public region country.name_en should match created country name_en",
    publicRegion.country.name_en,
    country.name_en,
  );
  TestValidator.equals(
    "public region country.is_active should be true",
    publicRegion.country.is_active,
    true,
  );
  TestValidator.equals(
    "public region country.sort_order should match created country sort_order",
    publicRegion.country.sort_order,
    country.sort_order,
  );
}
