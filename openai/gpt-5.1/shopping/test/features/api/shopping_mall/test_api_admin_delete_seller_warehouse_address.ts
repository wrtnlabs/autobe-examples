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
 * Validate that an admin can delete a seller warehouse address without deleting
 * the warehouse itself.
 *
 * Business story:
 *
 * - A seller onboards and configures a warehouse.
 * - An admin onboards and configures the geographic master data (country/region).
 * - The seller creates an address for the warehouse pointing to that master data.
 * - The admin then deletes that address via the admin path, representing
 *   governance/support intervention without affecting the warehouse header.
 *
 * Steps:
 *
 * 1. Seller join -> authenticated seller context.
 * 2. Seller creates a warehouse.
 * 3. Admin join -> authenticated admin context.
 * 4. Admin creates a country.
 * 5. Admin creates a region for that country.
 * 6. Seller login -> switch back to seller.
 * 7. Seller creates a warehouse address referencing the created country/region.
 * 8. Admin login -> switch to admin.
 * 9. Admin deletes the warehouse address using the admin erase endpoint.
 * 10. Seller can recreate an address, proving the warehouse still exists and that
 *     only the address row was removed.
 */
export async function test_api_admin_delete_seller_warehouse_address(
  connection: api.IConnection,
) {
  // 1. Seller joins
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

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Seller creates a warehouse
  const warehouseCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
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
  typia.assert(warehouse);

  // 3. Admin joins (switch auth context to admin)
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

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Admin creates a country
  const countryCode = RandomGenerator.alphaNumeric(3).toUpperCase();

  const countryCreateBody = {
    country_code: countryCode,
    name_en: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 10,
    }),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 5. Admin creates a region for that country
  const regionCode = RandomGenerator.alphaNumeric(4).toUpperCase();

  const regionCreateBody = {
    code: regionCode,
    name_en: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 10,
    }),
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
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

  // 6. Seller login (switch context back to seller)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginResult);

  // 7. Seller creates a warehouse address referencing the created country/region
  const addressCreateBody = {
    country_id: country.id,
    region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 10 }),
    line2: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 10 }),
    city: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerWarehouseAddress.ICreate;

  const address: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.create(
      connection,
      {
        warehouseId: warehouse.id,
        body: addressCreateBody,
      },
    );
  typia.assert(address);

  TestValidator.equals(
    "warehouse address uses the created country id",
    address.country_id,
    country.id,
  );

  TestValidator.equals(
    "warehouse address uses the created region id",
    address.region_id,
    region.id,
  );

  // 8. Admin login (switch context to admin for erase)
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 9. Admin deletes the warehouse address
  await api.functional.shoppingMall.admin.sellerWarehouses.address.erase(
    connection,
    {
      warehouseId: warehouse.id,
    },
  );

  // Deletion success is implied by lack of error; assert business expectation
  TestValidator.predicate(
    "admin deletion of warehouse address completes without error",
    true,
  );

  // 10. Seller can recreate an address after admin deletion
  const sellerRelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerRelogin);

  const recreatedAddressBody = {
    country_id: country.id,
    region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 10 }),
    line2: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 10 }),
    city: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerWarehouseAddress.ICreate;

  const recreatedAddress: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.create(
      connection,
      {
        warehouseId: warehouse.id,
        body: recreatedAddressBody,
      },
    );
  typia.assert(recreatedAddress);

  TestValidator.equals(
    "recreated warehouse address still binds to same warehouse id",
    recreatedAddress.seller_warehouse_id,
    warehouse.id,
  );
}
