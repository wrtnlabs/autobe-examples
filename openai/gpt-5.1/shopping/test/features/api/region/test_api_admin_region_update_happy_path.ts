import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

export async function test_api_admin_region_update_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a fresh admin and obtain authenticated context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!" as string & tags.Format<"password">,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new active country
  const countryCode: string = RandomGenerator.alphabets(2).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: `Country ${countryCode}`,
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

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
    "country is_active should be true",
    country.is_active,
    countryCreateBody.is_active,
  );

  // 3. Create an active region under the country
  const regionCode: string = RandomGenerator.alphabets(5).toUpperCase();
  const initialRegionType: string | null = null;
  const regionCreateBody = {
    code: regionCode,
    name_en: `Region ${regionCode}`,
    region_type: initialRegionType,
    is_active: true,
    sort_order: 10 as number & tags.Type<"int32">,
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

  TestValidator.equals(
    "region country.country_code should match path countryCode",
    region.country.country_code,
    country.country_code,
  );
  TestValidator.equals(
    "region code should match creation payload",
    region.code,
    regionCreateBody.code,
  );
  TestValidator.equals(
    "region is_active should match creation payload",
    region.is_active,
    regionCreateBody.is_active,
  );
  TestValidator.equals(
    "region sort_order should match creation payload",
    region.sort_order,
    regionCreateBody.sort_order,
  );

  // 4. Update the region with multiple field changes
  const updatedNameEn = `${region.name_en} - Updated`;
  const updatedIsActive = !region.is_active;
  const updatedSortOrder = (region.sort_order + 5) as number &
    tags.Type<"int32">;
  const updatedRegionType = "city";

  const regionUpdateBody = {
    name_en: updatedNameEn,
    is_active: updatedIsActive,
    sort_order: updatedSortOrder,
    region_type: updatedRegionType,
  } satisfies IShoppingMallRegion.IUpdate;

  const updatedRegion: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.update(
      connection,
      {
        countryCode: country.country_code,
        regionCode: region.code,
        body: regionUpdateBody,
      },
    );
  typia.assert(updatedRegion);

  // 5. Validate updated fields and identity stability
  TestValidator.equals(
    "region id should remain stable after update",
    updatedRegion.id,
    region.id,
  );
  TestValidator.equals(
    "updated region country.country_code should equal original country_code",
    updatedRegion.country.country_code,
    country.country_code,
  );
  TestValidator.equals(
    "updated region code should remain unchanged",
    updatedRegion.code,
    region.code,
  );
  TestValidator.equals(
    "updated region name_en should reflect new value",
    updatedRegion.name_en,
    updatedNameEn,
  );
  TestValidator.equals(
    "updated region is_active should reflect toggled value",
    updatedRegion.is_active,
    updatedIsActive,
  );
  TestValidator.equals(
    "updated region sort_order should reflect new value",
    updatedRegion.sort_order,
    updatedSortOrder,
  );
  TestValidator.equals(
    "updated region region_type should reflect new value",
    updatedRegion.region_type ?? null,
    updatedRegionType,
  );

  // 6. Validate audit fields: updated_at should be more recent or equal to created_at
  const createdAt = new Date(updatedRegion.created_at);
  const updatedAt = new Date(updatedRegion.updated_at);

  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    updatedAt.getTime() >= createdAt.getTime(),
  );

  // deleted_at should remain null or undefined in happy path
  TestValidator.equals(
    "deleted_at should remain null or undefined after update",
    updatedRegion.deleted_at ?? null,
    null,
  );
}
