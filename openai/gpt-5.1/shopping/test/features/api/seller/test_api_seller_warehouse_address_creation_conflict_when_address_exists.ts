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
 * Validate that creating a second address for the same seller warehouse results
 * in a conflict-style error and does not overwrite the original address.
 *
 * Business flow:
 *
 * 1. Seller joins and logs in to establish seller context.
 * 2. Admin joins and logs in to configure country and region master data.
 * 3. As admin, create a country and a region used by the warehouse address.
 * 4. Switch back to seller and create a warehouse.
 * 5. Create the initial warehouse address (happy path) and store it.
 * 6. Attempt to create a second address for the same warehouse with different
 *    valid data and assert that the call fails (business conflict).
 * 7. Reload the warehouse address and verify that all fields still match the
 *    first-created address, confirming that the second attempt did not modify
 *    persisted data.
 */
export async function test_api_seller_warehouse_address_creation_conflict_when_address_exists(
  connection: api.IConnection,
) {
  // 1. Seller joins the platform
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  // Ensure seller login works and token is active
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 2. Admin joins the platform
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // Admin login to ensure admin token is active
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Admin creates a country master
  const countryCreateBody = {
    country_code: RandomGenerator.alphaNumeric(3),
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 4. Admin creates a region under that country
  const regionCreateBody = {
    code: RandomGenerator.alphaNumeric(4),
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    region_type: "state",
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
  typia.assert(region);

  // 5. Switch back to seller context via login
  const sellerReLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReLogin);

  // Seller creates a warehouse
  const warehouseCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 6. First address creation (happy path)
  const firstAddressBody = {
    country_id: country.id,
    region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 1 }),
    line2: RandomGenerator.paragraph({ sentences: 1 }),
    city: "Seoul",
    postal_code: RandomGenerator.alphaNumeric(5),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerWarehouseAddress.ICreate;

  const firstAddress: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.create(
      connection,
      {
        warehouseId: warehouse.id,
        body: firstAddressBody,
      },
    );
  typia.assert(firstAddress);

  // 7. Second address creation attempt for the same warehouse (should fail)
  const secondAddressBody = {
    country_id: country.id,
    region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 1 }),
    line2: RandomGenerator.paragraph({ sentences: 1 }),
    city: "Busan",
    postal_code: RandomGenerator.alphaNumeric(5),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerWarehouseAddress.ICreate;

  await TestValidator.error(
    "second warehouse address creation should fail due to one-to-one constraint",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.address.create(
        connection,
        {
          warehouseId: warehouse.id,
          body: secondAddressBody,
        },
      );
    },
  );

  // 8. Reload the address and verify it remains unchanged
  const reloadedAddress: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.at(
      connection,
      {
        warehouseId: warehouse.id,
      },
    );
  typia.assert(reloadedAddress);

  TestValidator.equals(
    "warehouse address id should remain unchanged",
    reloadedAddress.id,
    firstAddress.id,
  );
  TestValidator.equals(
    "warehouse id should remain linked to original warehouse",
    reloadedAddress.seller_warehouse_id,
    firstAddress.seller_warehouse_id,
  );
  TestValidator.equals(
    "country id should remain from first address",
    reloadedAddress.country_id,
    firstAddress.country_id,
  );
  TestValidator.equals(
    "region id should remain from first address",
    reloadedAddress.region_id,
    firstAddress.region_id,
  );
  TestValidator.equals(
    "recipient name should remain from first address",
    reloadedAddress.recipient_name,
    firstAddress.recipient_name,
  );
  TestValidator.equals(
    "line1 should remain from first address",
    reloadedAddress.line1,
    firstAddress.line1,
  );
  TestValidator.equals(
    "line2 should remain from first address",
    reloadedAddress.line2,
    firstAddress.line2,
  );
  TestValidator.equals(
    "city should remain from first address",
    reloadedAddress.city,
    firstAddress.city,
  );
  TestValidator.equals(
    "postal code should remain from first address",
    reloadedAddress.postal_code,
    firstAddress.postal_code,
  );
  TestValidator.equals(
    "phone should remain from first address",
    reloadedAddress.phone,
    firstAddress.phone,
  );
}
