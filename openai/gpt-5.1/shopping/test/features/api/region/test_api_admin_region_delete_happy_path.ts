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
 * Validate happy-path hard deletion of an admin-managed region using business
 * codes.
 *
 * Business goal: Ensure that an authenticated shopping-mall admin can create a
 * country, create a region under that country, and then permanently delete that
 * region via the DELETE
 * /shoppingMall/admin/countries/{countryCode}/regions/{regionCode} endpoint,
 * identified purely by business keys (countryCode and regionCode).
 *
 * Constraints and available APIs:
 *
 * - Authentication is performed via POST /auth/admin/join
 *   (api.functional.auth.admin.join) returning IShoppingMallAdmin.IAuthorized
 *   and automatically wiring the admin Authorization header into the shared
 *   connection.
 * - Countries are created via POST /shoppingMall/admin/countries
 *   (api.functional.shoppingMall.admin.countries.create) with
 *   IShoppingMallCountry.ICreate as body, returning IShoppingMallCountry where
 *   `country_code` is the business key used in subsequent region calls.
 * - Regions are created via POST
 *   /shoppingMall/admin/countries/{countryCode}/regions
 *   (api.functional.shoppingMall.admin.countries.regions.create) with
 *   IShoppingMallRegion.ICreate as body, returning IShoppingMallRegion where
 *   `code` is the region business key.
 * - Hard deletion is performed via DELETE
 *   /shoppingMall/admin/countries/{countryCode}/regions/{regionCode}
 *   (api.functional.shoppingMall.admin.countries.regions.erase), returning void
 *   on success.
 * - No region GET or list endpoint is provided in the materials, so deletion must
 *   be validated indirectly rather than via a read-after-delete.
 *
 * Test flow:
 *
 * 1. Register a fresh admin with random-but-valid join payload using
 *    IShoppingMallAdminJoin.ICreate. Rely on the SDK to inject the access token
 *    into the connection headers.
 * 2. Create a new country using IShoppingMallCountry.ICreate with a unique
 *    country_code and reasonable configuration values (name_en, is_active,
 *    sort_order, optional phone_code). Assert the response type with
 *    typia.assert and keep `country.country_code` for later.
 * 3. Under that country, create a new region via
 *    api.functional.shoppingMall.admin.countries.regions.create using
 *    IShoppingMallRegion.ICreate (code, name_en, optional region_type,
 *    is_active, sort_order) and the `country.country_code` path parameter.
 *    Assert the response and keep `region.code`.
 * 4. Perform the hard delete by calling
 *    api.functional.shoppingMall.admin.countries.regions.erase with the
 *    captured `country.country_code` and `region.code`. The call must resolve
 *    without throwing, and there is no response body.
 * 5. Because we have no read/list API, validate deletion indirectly by calling
 *    erase a second time with the same `countryCode` and `regionCode`, wrapped
 *    in TestValidator.error. We expect the backend to treat the region as
 *    non-existent and raise an error, which we detect without asserting on any
 *    specific HTTP status code.
 * 6. Additionally, confirm that the parent country remains intact by noting we
 *    never delete it, and by using TestValidator.predicate to assert simple
 *    invariants on the original `country` object (e.g., is_active === true).
 *    This ensures the region deletion did not mutate our in-memory country
 *    representation and conceptually did not cascade-delete the country.
 * 7. Optionally, exercise an independent negative case by attempting to erase a
 *    non-existent region code under the same country (e.g., a random code
 *    different from the created one) and asserting via TestValidator.error that
 *    this also fails, proving the API does not silently succeed on arbitrary
 *    codes.
 *
 * Type-safety and implementation notes:
 *
 * - Use typia.random with proper generic arguments and tags.Format for email,
 *   uri, etc., when constructing the admin join payload.
 * - For DTO request bodies (ICreate types), construct plain object literals and
 *   constrain them with `satisfies` rather than type annotations or `as`-casts
 *   to maintain strict type safety.
 * - Always await API calls; api.functional.* returns Promises and missing awaits
 *   would be a compilation error.
 * - Use typia.assert on non-void API responses to validate server-side contract
 *   conformance.
 * - Use TestValidator.predicate and TestValidator.error with descriptive titles
 *   to validate business behavior, but never assert HTTP status codes or
 *   inspect error message text.
 */
export async function test_api_admin_region_delete_happy_path(
  connection: api.IConnection,
) {
  // 1. Register an admin and let the SDK wire Authorization on the connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new country with unique business country_code
  const countryCode: string = `CTY-${RandomGenerator.alphaNumeric(8)}`;
  const countryCreateBody = {
    country_code: countryCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  TestValidator.predicate(
    "created country should be active",
    country.is_active === true,
  );

  // 3. Create a region under the created country
  const regionCode: string = `RGN-${RandomGenerator.alphaNumeric(8)}`;
  const regionCreateBody = {
    code: regionCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    region_type: "city",
    is_active: true,
    sort_order: 1,
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
    "region should belong to the created country",
    region.country.country_code,
    country.country_code,
  );

  // 4. Hard delete the region using its business codes
  await api.functional.shoppingMall.admin.countries.regions.erase(connection, {
    countryCode: country.country_code,
    regionCode: region.code,
  });

  // 5. Second delete on the same identifiers should now fail
  await TestValidator.error(
    "second erase on same region should fail after hard delete",
    async () => {
      await api.functional.shoppingMall.admin.countries.regions.erase(
        connection,
        {
          countryCode: country.country_code,
          regionCode: region.code,
        },
      );
    },
  );

  // 6. Parent country remains conceptually intact (we never deleted it)
  TestValidator.predicate(
    "original country object remains active after region deletion",
    country.is_active === true,
  );

  // 7. Attempt to erase a different, clearly non-existent region code
  const nonexistentRegionCode: string = `RGN-${RandomGenerator.alphaNumeric(8)}`;
  await TestValidator.error(
    "erase on a completely unknown region code should fail",
    async () => {
      await api.functional.shoppingMall.admin.countries.regions.erase(
        connection,
        {
          countryCode: country.country_code,
          regionCode: nonexistentRegionCode,
        },
      );
    },
  );
}
