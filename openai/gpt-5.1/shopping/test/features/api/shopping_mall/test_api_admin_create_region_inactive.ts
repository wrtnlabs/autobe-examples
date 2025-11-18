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
 * Validate that an admin can create an inactive region under a country and that
 * the region and its parent country summary are persisted correctly.
 *
 * Business flow:
 *
 * 1. Admin joins via /auth/admin/join, establishing admin auth context.
 * 2. Admin creates a country via /shoppingMall/admin/countries and we capture its
 *    country_code and summary fields.
 * 3. Admin creates a region under that country via
 *    /shoppingMall/admin/countries/{countryCode}/regions with is_active=false.
 * 4. Validate that the region is created with is_active=false and that the
 *    embedded country summary aligns with the created country.
 */
export async function test_api_admin_create_region_inactive(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a country
  const countryBody = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: RandomGenerator.name(1),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  // 3. Create an inactive region under that country
  const regionBody = {
    code: RandomGenerator.alphaNumeric(6),
    name_en: RandomGenerator.name(1),
    region_type: RandomGenerator.name(1),
    is_active: false,
    sort_order: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  // 4. Business validations
  // 4-1. Region inactive flag must be false
  TestValidator.equals(
    "region is created as inactive",
    region.is_active,
    false,
  );

  // 4-2. Parent country summary fields must match created country master
  TestValidator.equals(
    "region.country.id matches country.id",
    region.country.id,
    country.id,
  );
  TestValidator.equals(
    "region.country.country_code matches country.country_code",
    region.country.country_code,
    country.country_code,
  );
  TestValidator.equals(
    "region.country.name_en matches country.name_en",
    region.country.name_en,
    country.name_en,
  );
  TestValidator.equals(
    "region.country.is_active matches country.is_active",
    region.country.is_active,
    country.is_active,
  );
  TestValidator.equals(
    "region.country.sort_order matches country.sort_order",
    region.country.sort_order,
    country.sort_order,
  );

  // 4-3. Region identity fields match request body
  TestValidator.equals(
    "region.code matches request body",
    region.code,
    regionBody.code,
  );
  TestValidator.equals(
    "region.name_en matches request body",
    region.name_en,
    regionBody.name_en,
  );
  TestValidator.equals(
    "region.region_type matches request body",
    region.region_type,
    regionBody.region_type,
  );
  TestValidator.equals(
    "region.sort_order matches request body",
    region.sort_order,
    regionBody.sort_order,
  );
}
