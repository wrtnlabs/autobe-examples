import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

export async function test_api_admin_region_update_deactivate_region(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authorized context
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
  typia.assert(adminAuthorized);

  // 2. Create an active country for hosting the region
  const countryCode: string = RandomGenerator.alphabets(3).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+82",
    is_active: true,
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >() satisfies number,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  TestValidator.equals(
    "created country_code must equal requested country_code",
    country.country_code,
    countryCode,
  );
  TestValidator.predicate(
    "created country must be active",
    country.is_active === true,
  );

  // 3. Create an initially active region under that country
  const regionCode: string = RandomGenerator.alphabets(5).toUpperCase();
  const regionCreateBody = {
    code: regionCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    region_type: "state",
    is_active: true,
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >() satisfies number,
  } satisfies IShoppingMallRegion.ICreate;

  const createdRegion: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert(createdRegion);

  TestValidator.equals(
    "created region code must equal requested code",
    createdRegion.code,
    regionCode,
  );
  TestValidator.equals(
    "created region country_code must equal parent country_code",
    createdRegion.country.country_code,
    countryCode,
  );
  TestValidator.predicate(
    "created region must start active",
    createdRegion.is_active === true,
  );

  const originalRegionId = createdRegion.id;
  const originalUpdatedAt = createdRegion.updated_at;
  const originalCreatedAt = createdRegion.created_at;
  const originalDeletedAt = createdRegion.deleted_at ?? null;

  // 4. Deactivate the region via update, optionally adjusting other fields
  const updateBody = {
    is_active: false,
    region_type: "state", // keep same type for simplicity
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >() satisfies number,
  } satisfies IShoppingMallRegion.IUpdate;

  const updatedRegion: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.update(
      connection,
      {
        countryCode: countryCode,
        regionCode: regionCode,
        body: updateBody,
      },
    );
  typia.assert(updatedRegion);

  // 5. Core assertions about deactivation and identity preservation
  TestValidator.equals(
    "updated region must have same id as created region",
    updatedRegion.id,
    originalRegionId,
  );
  TestValidator.equals(
    "updated region code must remain unchanged",
    updatedRegion.code,
    regionCode,
  );
  TestValidator.equals(
    "updated region country_code must still match parent country_code",
    updatedRegion.country.country_code,
    countryCode,
  );
  TestValidator.predicate(
    "updated region must now be inactive",
    updatedRegion.is_active === false,
  );

  // 6. Validate timestamps reflect update semantics
  TestValidator.equals(
    "created_at must remain unchanged after update",
    updatedRegion.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at should change after update",
    updatedRegion.updated_at !== originalUpdatedAt,
  );

  // 7. Ensure deactivation does not soft-delete the region
  const updatedDeletedAt = updatedRegion.deleted_at ?? null;
  TestValidator.equals(
    "deleted_at must remain null after deactivation (no soft delete)",
    updatedDeletedAt,
    originalDeletedAt,
  );
}
