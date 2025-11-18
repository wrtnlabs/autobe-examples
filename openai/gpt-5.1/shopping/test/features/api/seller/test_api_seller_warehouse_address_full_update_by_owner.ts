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
 * Verify that a seller can fully update their warehouse address, including
 * switching to different country/region masters, and that changes persist
 * correctly with proper timestamp semantics.
 *
 * Business flow:
 *
 * 1. Seller joins (creating an authenticated seller context).
 * 2. Seller creates a warehouse.
 * 3. Admin joins and creates two countries.
 * 4. Admin creates one region under each country.
 * 5. Seller logs in again to restore seller auth context.
 * 6. Seller creates an initial address for the warehouse using the first
 *    country/region.
 * 7. Seller reads back the address to capture created_at/updated_at baseline.
 * 8. Seller performs a PUT update that changes all mutable address fields and
 *    switches country_id/region_id to the second country/region.
 * 9. Validate that:
 *
 *    - All scalar fields reflect updated values.
 *    - Country_id/region_id and their summary objects reference the second master
 *         records.
 *    - Created_at remains unchanged while updated_at is newer than before.
 * 10. Seller GETs the address again and we confirm it matches the updated response,
 *     ensuring persistence.
 */
export async function test_api_seller_warehouse_address_full_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register seller via /auth/seller/join (also authenticates)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. As seller, create warehouse
  const warehouseBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseBody,
      },
    );
  typia.assert(warehouse);

  // 3. Create and authenticate admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. As admin, create two countries
  const countryBody1 = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: "Country-One",
    phone_code: "+100",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country1: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody1,
    });
  typia.assert(country1);

  const countryBody2 = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: "Country-Two",
    phone_code: "+200",
    is_active: true,
    sort_order: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country2: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody2,
    });
  typia.assert(country2);

  // 5. For each country, create one region
  const regionBody1 = {
    code: "R1",
    name_en: "Region-One",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region1: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country1.country_code,
        body: regionBody1,
      },
    );
  typia.assert(region1);

  const regionBody2 = {
    code: "R2",
    name_en: "Region-Two",
    region_type: "state",
    is_active: true,
    sort_order: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region2: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country2.country_code,
        body: regionBody2,
      },
    );
  typia.assert(region2);

  // 6. Switch back to seller context (login)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/dashboard",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 7. Create initial address for the warehouse with first country/region
  const initialAddressBody = {
    country_id: country1.id,
    region_id: region1.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: RandomGenerator.paragraph({ sentences: 2 }),
    city: "Initial City",
    postal_code: RandomGenerator.alphaNumeric(8),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerWarehouseAddress.ICreate;

  const initialAddress: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.create(
      connection,
      {
        warehouseId: warehouse.id,
        body: initialAddressBody,
      },
    );
  typia.assert(initialAddress);

  TestValidator.equals(
    "initial address belongs to warehouse",
    initialAddress.seller_warehouse_id,
    warehouse.id,
  );
  TestValidator.equals(
    "initial address country matches first country",
    initialAddress.country.id,
    country1.id,
  );
  TestValidator.equals(
    "initial address region matches first region",
    initialAddress.region?.id ?? null,
    region1.id,
  );

  // 8. GET the address to capture baseline timestamps
  const fetchedInitial: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.at(
      connection,
      {
        warehouseId: warehouse.id,
      },
    );
  typia.assert(fetchedInitial);

  TestValidator.equals(
    "fetched initial address equals created initial address",
    fetchedInitial,
    initialAddress,
  );

  const originalCreatedAt = fetchedInitial.created_at;
  const originalUpdatedAt = fetchedInitial.updated_at;

  // 9. Build full update payload switching to second country/region and new fields
  const updatedRecipient = RandomGenerator.name(2);
  const updatedLine1 = RandomGenerator.paragraph({ sentences: 3 });
  const updatedLine2 = RandomGenerator.paragraph({ sentences: 2 });
  const updatedCity = "Updated City";
  const updatedPostal = RandomGenerator.alphaNumeric(8);
  const updatedPhone = RandomGenerator.mobile();

  const updateBody = {
    country_id: country2.id,
    region_id: region2.id,
    recipient_name: updatedRecipient,
    line1: updatedLine1,
    line2: updatedLine2,
    city: updatedCity,
    postal_code: updatedPostal,
    phone: updatedPhone,
  } satisfies IShoppingMallSellerWarehouseAddress.IUpdate;

  // 10. PUT update
  const updatedAddress: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.update(
      connection,
      {
        warehouseId: warehouse.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAddress);

  // 11. Validate PUT response content
  TestValidator.equals(
    "updated address still belongs to same warehouse",
    updatedAddress.seller_warehouse_id,
    warehouse.id,
  );
  TestValidator.equals(
    "recipient_name updated correctly",
    updatedAddress.recipient_name,
    updatedRecipient,
  );
  TestValidator.equals(
    "line1 updated correctly",
    updatedAddress.line1,
    updatedLine1,
  );
  TestValidator.equals(
    "line2 updated correctly",
    updatedAddress.line2 ?? null,
    updatedLine2,
  );
  TestValidator.equals(
    "city updated correctly",
    updatedAddress.city,
    updatedCity,
  );
  TestValidator.equals(
    "postal_code updated correctly",
    updatedAddress.postal_code,
    updatedPostal,
  );
  TestValidator.equals(
    "phone updated correctly",
    updatedAddress.phone ?? null,
    updatedPhone,
  );

  TestValidator.equals(
    "country_id switched to second country",
    updatedAddress.country_id,
    country2.id,
  );
  TestValidator.equals(
    "region_id switched to second region",
    updatedAddress.region_id ?? null,
    region2.id,
  );

  TestValidator.equals(
    "country object matches second country id",
    updatedAddress.country.id,
    country2.id,
  );
  TestValidator.equals(
    "country summary code matches second country_code",
    updatedAddress.country.country_code,
    country2.country_code,
  );
  TestValidator.equals(
    "country summary name matches second name_en",
    updatedAddress.country.name_en,
    country2.name_en,
  );

  TestValidator.equals(
    "region summary id matches second region id",
    updatedAddress.region?.id ?? null,
    region2.id,
  );
  TestValidator.equals(
    "region summary code matches second region code",
    updatedAddress.region?.code ?? null,
    region2.code,
  );
  TestValidator.equals(
    "region summary name matches second region name",
    updatedAddress.region?.name_en ?? null,
    region2.name_en,
  );

  TestValidator.equals(
    "created_at remains unchanged after update",
    updatedAddress.created_at,
    originalCreatedAt,
  );

  const originalUpdatedAtDate = new Date(originalUpdatedAt).getTime();
  const newUpdatedAtDate = new Date(updatedAddress.updated_at).getTime();

  TestValidator.predicate(
    "updated_at is newer than original",
    newUpdatedAtDate > originalUpdatedAtDate,
  );

  // 12. GET after update to ensure persistence
  const fetchedUpdated: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.at(
      connection,
      {
        warehouseId: warehouse.id,
      },
    );
  typia.assert(fetchedUpdated);

  TestValidator.equals(
    "GET after update matches updated address payload",
    fetchedUpdated,
    updatedAddress,
  );

  TestValidator.equals(
    "persisted country after update is second country",
    fetchedUpdated.country.id,
    country2.id,
  );
  TestValidator.equals(
    "persisted region after update is second region",
    fetchedUpdated.region?.id ?? null,
    region2.id,
  );
}
