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
 * Admin can create a region under an existing country and the region is
 * correctly linked back to that country.
 *
 * Business flow:
 *
 * 1. Admin joins (POST /auth/admin/join) to obtain an authorized admin context.
 * 2. Authenticated admin creates a country (POST /shoppingMall/admin/countries)
 *    with IShoppingMallCountry.ICreate.
 * 3. Using the created country.country_code as path parameter, the admin creates a
 *    region via POST /shoppingMall/admin/countries/{countryCode}/regions,
 *    sending an IShoppingMallRegion.ICreate payload.
 * 4. Validate the returned IShoppingMallRegion is structurally correct and its
 *    embedded country summary matches the parent country.
 */
export async function test_api_admin_create_region_under_country(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authorized context (token handled by SDK)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional, can be omitted; href and referrer are required URIs
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a parent country as this admin
  const countryCreateBody = {
    country_code: RandomGenerator.alphaNumeric(3).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+" + RandomGenerator.alphaNumeric(3),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // Basic sanity checks on created country
  TestValidator.equals(
    "country_code should match creation payload",
    country.country_code,
    countryCreateBody.country_code,
  );
  TestValidator.equals(
    "country name_en should match creation payload",
    country.name_en,
    countryCreateBody.name_en,
  );
  TestValidator.equals(
    "country is_active should match creation payload",
    country.is_active,
    countryCreateBody.is_active,
  );
  TestValidator.equals(
    "country sort_order should match creation payload",
    country.sort_order,
    countryCreateBody.sort_order,
  );
  TestValidator.predicate("country.id must be a UUID string", () =>
    /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(
      country.id,
    ),
  );

  // 3. Create a region under this country using its country_code as path param
  const regionCreateBody = {
    code: RandomGenerator.alphaNumeric(5).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    region_type: "state",
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 4. Validate region fields and linkage to country summary
  TestValidator.equals(
    "region.code should match request payload",
    region.code,
    regionCreateBody.code,
  );
  TestValidator.equals(
    "region.name_en should match request payload",
    region.name_en,
    regionCreateBody.name_en,
  );
  TestValidator.equals(
    "region.is_active should match request payload",
    region.is_active,
    regionCreateBody.is_active,
  );
  TestValidator.equals(
    "region.sort_order should match request payload",
    region.sort_order,
    regionCreateBody.sort_order,
  );
  TestValidator.equals(
    "region.region_type should match request payload",
    region.region_type,
    regionCreateBody.region_type,
  );

  // region.id and timestamps basic checks
  TestValidator.predicate("region.id must be a UUID string", () =>
    /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(
      region.id,
    ),
  );
  TestValidator.predicate(
    "region.created_at must be a non-empty string",
    () => region.created_at.length > 0,
  );
  TestValidator.predicate(
    "region.updated_at must be a non-empty string",
    () => region.updated_at.length > 0,
  );
  TestValidator.predicate(
    "region.deleted_at should be null or undefined right after creation",
    () => region.deleted_at === null || region.deleted_at === undefined,
  );

  // Validate embedded country summary linkage
  TestValidator.equals(
    "region.country.id should match country.id",
    region.country.id,
    country.id,
  );
  TestValidator.equals(
    "region.country.country_code should match country.country_code",
    region.country.country_code,
    country.country_code,
  );
  TestValidator.equals(
    "region.country.name_en should match country.name_en",
    region.country.name_en,
    country.name_en,
  );
  TestValidator.equals(
    "region.country.is_active should match country.is_active",
    region.country.is_active,
    country.is_active,
  );
  TestValidator.equals(
    "region.country.sort_order should match country.sort_order",
    region.country.sort_order,
    country.sort_order,
  );

  // Business invariant: country referenced by region should be active.
  TestValidator.predicate(
    "linked country in region must be active",
    () => region.country.is_active === true,
  );
}
