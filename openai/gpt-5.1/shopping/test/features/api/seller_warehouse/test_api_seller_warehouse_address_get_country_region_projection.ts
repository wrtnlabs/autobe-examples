import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";
import type { IShoppingMallSellerWarehouseAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouseAddress";

/**
 * Validate hydrated country and region projections when reading a seller
 * warehouse address.
 *
 * ## Business goal
 *
 * Ensure that when a seller reads a warehouse address via GET
 * /shoppingMall/seller/sellerWarehouses/{warehouseId}/address, the API returns
 * not only raw foreign key IDs but also fully-populated country and region
 * summary objects aligned with the country/region masters that admin created
 * earlier. This allows a front-end to render country/region labels without
 * issuing extra lookup calls.
 *
 * ## High-level workflow
 *
 * 1. Admin actor joins and becomes authenticated (admin token on connection).
 * 2. Admin creates a country in shopping_mall_countries.
 * 3. Admin creates a region under that country via POST
 *    /shoppingMall/admin/countries/{countryCode}/regions.
 * 4. Seller actor joins and becomes authenticated (seller token on connection).
 * 5. Seller creates a warehouse via POST /shoppingMall/seller/sellerWarehouses.
 * 6. Seller creates an address for that warehouse, referencing the created
 *    country_id and region_id via POST
 *    /shoppingMall/seller/sellerWarehouses/{warehouseId}/address.
 * 7. Seller reads the address back via GET
 *    /shoppingMall/seller/sellerWarehouses/{warehouseId}/address.
 * 8. Test validates IDs and embedded projections.
 *
 * ## What this test verifies
 *
 * - The GET address endpoint returns an IShoppingMallSellerWarehouseAddress whose
 *   scalar IDs match what was created:
 *
 *   - Seller_warehouse_id equals the warehouse.id
 *   - Country_id equals the country.id
 *   - Region_id equals the region.id (non-null case)
 * - The `country` association is hydrated as IShoppingMallCountry.ISummary and
 *   its fields (id, country_code, name_en, phone_code, is_active, sort_order,
 *   created_at, updated_at) align with the created country record.
 * - The `region` association is hydrated as IShoppingMallRegion.ISummary when a
 *   region is specified, and its fields (id, code, name_en, region_type,
 *   is_active, sort_order, country) align with the created region and the same
 *   country summary.
 */
export async function test_api_seller_warehouse_address_get_country_region_projection(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain admin auth context
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoinResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoinResult);

  // 2. Admin creates a country
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();

  const countryCreateBody = {
    country_code: countryCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  // 3. Admin creates a region under that country using its business code
  const regionCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    region_type: "state",
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  // 4. Seller joins to obtain seller auth context
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoinResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoinResult);

  // 5. Seller creates a warehouse
  const warehouseCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(warehouse);

  // 6. Seller creates address for that warehouse referencing created country/region
  const addressCreateBody = {
    country_id: country.id,
    region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.paragraph({ sentences: 2 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerWarehouseAddress.ICreate;

  const createdAddress: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.create(
      connection,
      {
        warehouseId: warehouse.id,
        body: addressCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouseAddress>(createdAddress);

  // 7. Read address back via GET
  const fetchedAddress: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.at(
      connection,
      {
        warehouseId: warehouse.id,
      },
    );
  typia.assert<IShoppingMallSellerWarehouseAddress>(fetchedAddress);

  // 8. Validate scalar identifiers
  TestValidator.equals(
    "seller_warehouse_id should match warehouse.id",
    fetchedAddress.seller_warehouse_id,
    warehouse.id,
  );

  TestValidator.equals(
    "country_id on address should match created country.id",
    fetchedAddress.country_id,
    country.id,
  );

  TestValidator.equals(
    "region_id on address should match created region.id",
    fetchedAddress.region_id,
    region.id,
  );

  // 9. Validate hydrated country summary projection
  const countrySummary = fetchedAddress.country;
  typia.assert<IShoppingMallCountry.ISummary>(countrySummary);

  TestValidator.equals(
    "country summary id matches country.id",
    countrySummary.id,
    country.id,
  );

  TestValidator.equals(
    "country summary country_code matches created country_code",
    countrySummary.country_code,
    country.country_code,
  );

  TestValidator.equals(
    "country summary name_en matches created country name_en",
    countrySummary.name_en,
    country.name_en,
  );

  TestValidator.equals(
    "country summary is_active matches created country is_active",
    countrySummary.is_active,
    country.is_active,
  );

  TestValidator.equals(
    "country summary sort_order matches created country sort_order",
    countrySummary.sort_order,
    country.sort_order,
  );

  TestValidator.equals(
    "country summary phone_code matches created country phone_code",
    countrySummary.phone_code,
    country.phone_code,
  );

  // Timestamps are asserted by typia; here we only check consistency where reasonable
  TestValidator.predicate(
    "country summary created_at should be a non-empty string",
    countrySummary.created_at.length > 0,
  );

  TestValidator.predicate(
    "country summary updated_at should be a non-empty string",
    countrySummary.updated_at.length > 0,
  );

  // 10. Validate hydrated region summary projection (non-null case)
  const regionSummary = fetchedAddress.region;
  TestValidator.predicate(
    "region summary should be present when region_id is non-null",
    regionSummary !== null && regionSummary !== undefined,
  );

  if (regionSummary !== null && regionSummary !== undefined) {
    typia.assert<IShoppingMallRegion.ISummary>(regionSummary);

    TestValidator.equals(
      "region summary id matches region.id",
      regionSummary.id,
      region.id,
    );

    TestValidator.equals(
      "region summary code matches created region code",
      regionSummary.code,
      region.code,
    );

    TestValidator.equals(
      "region summary name_en matches created region name_en",
      regionSummary.name_en,
      region.name_en,
    );

    TestValidator.equals(
      "region summary region_type matches created region_type",
      regionSummary.region_type,
      region.region_type,
    );

    TestValidator.equals(
      "region summary is_active matches created region is_active",
      regionSummary.is_active,
      region.is_active,
    );

    TestValidator.equals(
      "region summary sort_order matches created region sort_order",
      regionSummary.sort_order,
      region.sort_order,
    );

    // Validate nested country summary inside region summary
    const nestedCountry = regionSummary.country;
    typia.assert<IShoppingMallCountry.ISummary>(nestedCountry);

    TestValidator.equals(
      "region.country.id matches country.id",
      nestedCountry.id,
      country.id,
    );

    TestValidator.equals(
      "region.country.country_code matches country.country_code",
      nestedCountry.country_code,
      country.country_code,
    );

    TestValidator.equals(
      "region.country.name_en matches country.name_en",
      nestedCountry.name_en,
      country.name_en,
    );
  }
}
