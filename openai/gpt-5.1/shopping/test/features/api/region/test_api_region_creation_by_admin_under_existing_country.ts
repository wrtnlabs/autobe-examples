import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

export async function test_api_region_creation_by_admin_under_existing_country(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Keep ip/href/referrer simple but valid; href/referrer must be URI
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a parent country with a unique country_code
  const countryCode: string = `CC-${RandomGenerator.alphaNumeric(6)}`;

  const countryCreateBody = {
    country_code: countryCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+" + RandomGenerator.alphaNumeric(3),
    is_active: true,
    sort_order: 1 satisfies number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const createdCountry: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(createdCountry);

  // Basic sanity checks between request and response for country
  TestValidator.equals(
    "country_code should match between create request and response",
    createdCountry.country_code,
    countryCreateBody.country_code,
  );
  TestValidator.equals(
    "country name_en should match between create request and response",
    createdCountry.name_en,
    countryCreateBody.name_en,
  );
  TestValidator.equals(
    "country is_active should match between create request and response",
    createdCountry.is_active,
    countryCreateBody.is_active,
  );
  TestValidator.equals(
    "country sort_order should match between create request and response",
    createdCountry.sort_order,
    countryCreateBody.sort_order,
  );

  // 3. Create a region under the created country using its business country_code
  const regionCode: string = `R-${RandomGenerator.alphaNumeric(6)}`;

  const regionCreateBody = {
    code: regionCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
    sort_order: 1 satisfies number & tags.Type<"int32">,
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

  // 4. Validate region fields against request payload and country linkage
  TestValidator.equals(
    "region code should match between create request and response",
    createdRegion.code,
    regionCreateBody.code,
  );
  TestValidator.equals(
    "region name_en should match between create request and response",
    createdRegion.name_en,
    regionCreateBody.name_en,
  );
  TestValidator.equals(
    "region is_active should match between create request and response",
    createdRegion.is_active,
    regionCreateBody.is_active,
  );
  TestValidator.equals(
    "region sort_order should match between create request and response",
    createdRegion.sort_order,
    regionCreateBody.sort_order,
  );

  // Validate that the region is linked to the correct country summary
  TestValidator.equals(
    "region country.id should match created country id",
    createdRegion.country.id,
    createdCountry.id,
  );
  TestValidator.equals(
    "region country.country_code should match created country country_code",
    createdRegion.country.country_code,
    createdCountry.country_code,
  );
  TestValidator.equals(
    "region country.name_en should match created country name_en",
    createdRegion.country.name_en,
    createdCountry.name_en,
  );

  // Ensure region is active and not soft-deleted at creation
  TestValidator.equals(
    "region should be active on creation",
    createdRegion.is_active,
    true,
  );
}
