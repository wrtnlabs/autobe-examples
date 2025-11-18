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
 * Validate lifecycle timestamps and soft-deletion fields on newly created
 * regions.
 *
 * Business context: Administrative operators manage master data for countries
 * and their nested regions (states, provinces, cities, etc.) in the shopping
 * mall platform. When a new region is created, the backend must correctly
 * populate lifecycle metadata such as created_at, updated_at, and deleted_at,
 * and wire the region to its parent country.
 *
 * This test verifies that when an admin creates a country and then immediately
 * creates a region under that country:
 *
 * 1. Admin can join and obtain an authenticated context using /auth/admin/join.
 * 2. A country can be created via /shoppingMall/admin/countries.
 * 3. A region can be created via
 *    /shoppingMall/admin/countries/{countryCode}/regions using the country_code
 *    from step 2.
 * 4. The returned IShoppingMallRegion has valid lifecycle timestamps and
 *    soft-deletion semantics at creation time.
 *
 * Validation details:
 *
 * - Created_at and updated_at are valid ISO 8601 date-time strings (fully
 *   enforced by typia.assert).
 * - Created_at and updated_at are very close to the current system time when the
 *   region was created (not in the distant past or future relative to a
 *   captured `now`). We allow a reasonable tolerance window to account for
 *   clock skew and DB/serialization precision.
 * - Created_at and updated_at are effectively equal at insertion time; their
 *   absolute difference must be within a small threshold (e.g., <= 5 seconds).
 * - Deleted_at is null or undefined, indicating the record is not soft-deleted on
 *   creation.
 * - The embedded country summary on the region matches the country we created
 *   (country_code equality check).
 */
export async function test_api_region_creation_initial_timestamps_and_lifecycle_fields(
  connection: api.IConnection,
) {
  // 1. Bootstrap admin context by joining
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // For ip we can safely send null, as it is optional and allows null
    ip: null,
    href: "https://admin.example.com/join", // any valid URI
    referrer: "https://admin.example.com/landing", // any valid URI
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a country as this admin
  const countryCode = RandomGenerator.alphaNumeric(6).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: RandomGenerator.name(2),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // Validate that the created country's business code matches the request
  TestValidator.equals(
    "created country_code should match input",
    country.country_code,
    countryCode,
  );

  // 3. Capture current time just before creating the region
  const nowBeforeRegion = new Date();

  // 4. Create a region under the created country
  const regionCode = RandomGenerator.alphaNumeric(6).toUpperCase();
  const regionCreateBody = {
    code: regionCode,
    name_en: RandomGenerator.name(2),
    region_type: "state",
    is_active: true,
    sort_order: 10,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // Capture time immediately after region creation
  const nowAfterRegion = new Date();

  // 5. Lifecycle timestamp validations
  const createdAt = new Date(region.created_at);
  const updatedAt = new Date(region.updated_at);

  // Sanity: timestamps should not be invalid dates
  TestValidator.predicate(
    "region.created_at should be a valid date",
    !Number.isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "region.updated_at should be a valid date",
    !Number.isNaN(updatedAt.getTime()),
  );

  // created_at and updated_at should fall between nowBeforeRegion and nowAfterRegion,
  // or at least not be far outside this window.
  TestValidator.predicate(
    "region.created_at should not be far in the past or future",
    createdAt.getTime() >= nowBeforeRegion.getTime() - 30_000 && // 30s buffer
      createdAt.getTime() <= nowAfterRegion.getTime() + 30_000,
  );
  TestValidator.predicate(
    "region.updated_at should not be far in the past or future",
    updatedAt.getTime() >= nowBeforeRegion.getTime() - 30_000 &&
      updatedAt.getTime() <= nowAfterRegion.getTime() + 30_000,
  );

  // created_at and updated_at should be very close on initial insert
  const diffMillis = Math.abs(updatedAt.getTime() - createdAt.getTime());
  TestValidator.predicate(
    "created_at and updated_at should be nearly equal on insert",
    diffMillis <= 5_000,
  );

  // deleted_at should be null or undefined (not soft-deleted on creation)
  TestValidator.predicate(
    "region.deleted_at should be null or undefined on creation",
    region.deleted_at === null || region.deleted_at === undefined,
  );

  // 6. Validate that region.country summary matches the created country
  TestValidator.equals(
    "region.country.country_code should match parent country_code",
    region.country.country_code,
    countryCode,
  );

  TestValidator.equals(
    "region.country.id should match parent country id",
    region.country.id,
    country.id,
  );
}
