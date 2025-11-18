import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

/**
 * Validate that region codes are unique per country but reusable across
 * countries.
 *
 * Business context: Administrative operators configure countries and their
 * regions in the ShoppingMall platform. Each region belongs to a single country
 * and is identified by a business-level `code` that must be unique within that
 * country (composite unique index on `[shopping_mall_country_id, code]`).
 * However, the same region code can legitimately be reused in another country.
 *
 * This test exercises that uniqueness rule through a realistic admin workflow:
 *
 * 1. Register an admin account.
 * 2. Create two distinct countries (A and B).
 * 3. Under Country A, create a region with code `R-001`.
 * 4. Attempt to create another region under Country A with the same code `R-001`
 *    and expect a failure.
 * 5. Under Country B, create a region with the same code `R-001` and expect
 *    success.
 *
 * Validations focus on:
 *
 * - Successful creation of both countries.
 * - Successful first region creation under Country A.
 * - Error on duplicate region code within Country A.
 * - Successful region creation with the same code under Country B, confirming
 *   that uniqueness is scoped to country, not global.
 */
export async function test_api_admin_create_multiple_regions_uniqueness_per_country(
  connection: api.IConnection,
) {
  // 1. Register an admin so that subsequent /shoppingMall/admin/* calls are authorized.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
    // ip is optional and nullable; omit it to let backend infer if desired.
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create two distinct countries (A and B).
  const countryCodeA = "CTRY-A-" + RandomGenerator.alphaNumeric(6);
  const countryCodeB = "CTRY-B-" + RandomGenerator.alphaNumeric(6);

  const countryABody = {
    country_code: countryCodeA,
    name_en: "Country A " + RandomGenerator.name(1),
    phone_code: "+001",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const countryA: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryABody,
    });
  typia.assert(countryA);

  const countryBBody = {
    country_code: countryCodeB,
    name_en: "Country B " + RandomGenerator.name(1),
    phone_code: "+002",
    is_active: true,
    sort_order: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const countryB: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBBody,
    });
  typia.assert(countryB);

  TestValidator.notEquals(
    "countries A and B must be different records",
    countryA.id,
    countryB.id,
  );

  // 3. Under Country A, create region R1 with code "R-001".
  const regionCode = "R-001";

  const regionABody = {
    code: regionCode,
    name_en: "Region R1 of A",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const regionA1: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryA.country_code,
        body: regionABody,
      },
    );
  typia.assert(regionA1);

  TestValidator.equals(
    "regionA1 should belong to Country A",
    regionA1.country.country_code,
    countryA.country_code,
  );
  TestValidator.equals(
    "regionA1 code should match input",
    regionA1.code,
    regionCode,
  );

  // 4. Attempt to create another region under Country A with the same code.
  const duplicateRegionABody = {
    code: regionCode,
    name_en: "Region R1 duplicate of A",
    region_type: "state",
    is_active: true,
    sort_order: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  await TestValidator.error(
    "duplicate region code within same country should fail",
    async () => {
      await api.functional.shoppingMall.admin.countries.regions.create(
        connection,
        {
          countryCode: countryA.country_code,
          body: duplicateRegionABody,
        },
      );
    },
  );

  // 5. Under Country B, create a region with the same code and expect success.
  const regionBBody = {
    code: regionCode,
    name_en: "Region R1 of B",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const regionB1: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryB.country_code,
        body: regionBBody,
      },
    );
  typia.assert(regionB1);

  TestValidator.equals(
    "regionB1 should belong to Country B",
    regionB1.country.country_code,
    countryB.country_code,
  );
  TestValidator.equals(
    "regionB1 code should match shared code",
    regionB1.code,
    regionCode,
  );

  TestValidator.notEquals(
    "region IDs for A1 and B1 should differ",
    regionA1.id,
    regionB1.id,
  );
}
