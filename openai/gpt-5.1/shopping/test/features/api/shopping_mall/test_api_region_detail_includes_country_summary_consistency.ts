import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

export async function test_api_region_detail_includes_country_summary_consistency(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized admin context
  const adminJoinInput = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Create a country with deterministic, assertion-friendly values
  const countryCodeBase = RandomGenerator.alphabets(3).toUpperCase();
  const countryCode = countryCodeBase; // simple alphabetic code

  const countryCreateBody = {
    country_code: countryCode,
    name_en: RandomGenerator.name(),
    phone_code: "+82",
    is_active: true,
    sort_order: 100,
  } satisfies IShoppingMallCountry.ICreate;

  const createdCountry: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(createdCountry);

  // Basic sanity checks on created country
  TestValidator.equals(
    "created country_code should match input",
    createdCountry.country_code,
    countryCreateBody.country_code,
  );
  TestValidator.equals(
    "created country name_en should match input",
    createdCountry.name_en,
    countryCreateBody.name_en,
  );
  TestValidator.equals(
    "created country is_active should match input",
    createdCountry.is_active,
    countryCreateBody.is_active,
  );
  TestValidator.equals(
    "created country sort_order should match input",
    createdCountry.sort_order,
    countryCreateBody.sort_order,
  );
  TestValidator.equals(
    "created country phone_code should match input",
    createdCountry.phone_code,
    countryCreateBody.phone_code,
  );

  // 3. Create a region under this country
  const regionCode = RandomGenerator.alphabets(5).toUpperCase();
  const regionCreateBody = {
    code: regionCode,
    name_en: RandomGenerator.name(),
    region_type: "state",
    is_active: true,
    sort_order: 10,
  } satisfies IShoppingMallRegion.ICreate;

  const createdRegion: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: createdCountry.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(createdRegion);

  // Validate that the created region reflects input and embeds the correct country summary
  TestValidator.equals(
    "created region code should match input",
    createdRegion.code,
    regionCreateBody.code,
  );
  TestValidator.equals(
    "created region name_en should match input",
    createdRegion.name_en,
    regionCreateBody.name_en,
  );

  TestValidator.equals(
    "embedded country_code in created region should match parent country",
    createdRegion.country.country_code,
    createdCountry.country_code,
  );
  TestValidator.equals(
    "embedded name_en in created region should match parent country",
    createdRegion.country.name_en,
    createdCountry.name_en,
  );
  TestValidator.equals(
    "embedded is_active in created region should match parent country",
    createdRegion.country.is_active,
    createdCountry.is_active,
  );
  TestValidator.equals(
    "embedded sort_order in created region should match parent country",
    createdRegion.country.sort_order,
    createdCountry.sort_order,
  );
  TestValidator.equals(
    "embedded phone_code in created region should match parent country",
    createdRegion.country.phone_code,
    createdCountry.phone_code,
  );

  // 4. Prepare an unauthenticated connection and fetch region detail publicly
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  const regionDetailFirst: IShoppingMallRegion =
    await api.functional.shoppingMall.countries.regions.at(publicConnection, {
      countryCode: createdCountry.country_code,
      regionCode: createdRegion.code,
    });
  typia.assert(regionDetailFirst);

  // 5. Validate embedded country summary consistency in the public detail response
  TestValidator.equals(
    "public detail region code should match created region code",
    regionDetailFirst.code,
    createdRegion.code,
  );
  TestValidator.equals(
    "public detail region name_en should match created region name_en",
    regionDetailFirst.name_en,
    createdRegion.name_en,
  );

  TestValidator.equals(
    "public detail embedded country_code should match parent country",
    regionDetailFirst.country.country_code,
    createdCountry.country_code,
  );
  TestValidator.equals(
    "public detail embedded name_en should match parent country",
    regionDetailFirst.country.name_en,
    createdCountry.name_en,
  );
  TestValidator.equals(
    "public detail embedded is_active should match parent country",
    regionDetailFirst.country.is_active,
    createdCountry.is_active,
  );
  TestValidator.equals(
    "public detail embedded sort_order should match parent country",
    regionDetailFirst.country.sort_order,
    createdCountry.sort_order,
  );
  TestValidator.equals(
    "public detail embedded phone_code should match parent country",
    regionDetailFirst.country.phone_code,
    createdCountry.phone_code,
  );

  // 6. Stability across repeated unauthenticated reads
  const regionDetailSecond: IShoppingMallRegion =
    await api.functional.shoppingMall.countries.regions.at(publicConnection, {
      countryCode: createdCountry.country_code,
      regionCode: createdRegion.code,
    });
  typia.assert(regionDetailSecond);

  TestValidator.equals(
    "region detail response should be stable across repeated reads",
    regionDetailSecond,
    regionDetailFirst,
  );
}
