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
 * Admin deletion of a seller warehouse address after seller lifecycle changes.
 *
 * This E2E scenario validates that the admin endpoint DELETE
 * /shoppingMall/admin/sellerWarehouses/{warehouseId}/address correctly deletes
 * the current address record associated with a seller warehouse, even when the
 * seller has previously deleted and recreated the address. The warehouse itself
 * must remain intact, and only the latest address should be affected.
 *
 * Business flow:
 *
 * 1. A seller account is registered and a seller warehouse is created.
 * 2. An admin account is registered and a country + region are configured.
 * 3. The seller creates an initial address for the warehouse.
 * 4. The seller deletes that address.
 * 5. The seller recreates a new address for the same warehouse.
 * 6. The admin deletes the warehouse address using the admin endpoint.
 *
 * Due to limited read APIs, the test validates behavior indirectly by asserting
 * that:
 *
 * - All create operations return valid DTOs (validated via typia.assert).
 * - Seller delete works and does not prevent re-creating a new address.
 * - Admin delete for the same warehouseId completes successfully after the
 *   seller’s delete + recreate cycle.
 * - The warehouse remains valid for the duration of the test (no errors when
 *   referencing its id in seller/admin operations).
 */
export async function test_api_admin_delete_warehouse_address_after_seller_delete_recreate(
  connection: api.IConnection,
) {
  // 1. Register and authenticate seller (join implicitly authenticates)
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

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuth);

  TestValidator.equals(
    "seller join email should match request",
    sellerAuth.email,
    sellerJoinBody.email,
  );

  // 2. Create seller warehouse under this seller
  const warehouseCreateBody = {
    code: `WH-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
    description: "Primary test warehouse",
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

  // 3. Register and authenticate admin (join implicitly authenticates)
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

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  TestValidator.equals(
    "admin join email should match request",
    adminAuth.email,
    adminJoinBody.email,
  );

  // 4. Admin creates a country
  const countryCode = RandomGenerator.alphaNumeric(3).toUpperCase();

  const countryCreateBody = {
    country_code: countryCode,
    name_en: `Country-${countryCode}`,
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  TestValidator.equals(
    "created country code should match request",
    country.country_code,
    countryCreateBody.country_code,
  );

  // 5. Admin creates a region under that country
  const regionCreateBody = {
    code: `R-${RandomGenerator.alphaNumeric(4)}`,
    name_en: "Test Region",
    region_type: null,
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
  typia.assert<IShoppingMallRegion>(region);

  TestValidator.equals(
    "region country code should match parent country",
    region.country.country_code,
    country.country_code,
  );

  // 6. Switch back to seller explicitly via login to ensure seller context
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/dashboard",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginAuth);

  TestValidator.equals(
    "seller login email should match",
    sellerLoginAuth.email,
    sellerLoginBody.email,
  );

  // 7. Seller creates initial address for the warehouse
  const initialAddressBody = {
    country_id: country.id,
    region_id: region.id,
    recipient_name: "Initial Recipient",
    line1: "123 Initial St",
    line2: "Suite 101",
    city: "Initial City",
    postal_code: "00001",
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
  typia.assert<IShoppingMallSellerWarehouseAddress>(initialAddress);

  TestValidator.equals(
    "initial address warehouse id should match",
    initialAddress.seller_warehouse_id,
    warehouse.id,
  );

  // 8. Seller deletes the initial address
  await api.functional.shoppingMall.seller.sellerWarehouses.address.erase(
    connection,
    {
      warehouseId: warehouse.id,
    },
  );

  // If erase threw, the test would fail. We can also assert idempotent
  // behavior by allowing a second delete wrapped in TestValidator.error
  // only if spec guaranteed an error. Since spec is unknown, we avoid
  // asserting negative behavior here.

  // 9. Seller recreates a new address for the same warehouse
  const recreatedAddressBody = {
    country_id: country.id,
    region_id: region.id,
    recipient_name: "Recreated Recipient",
    line1: "456 Recreated Ave",
    line2: null,
    city: "Recreated City",
    postal_code: "00002",
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
  typia.assert<IShoppingMallSellerWarehouseAddress>(recreatedAddress);

  TestValidator.equals(
    "recreated address warehouse id should match",
    recreatedAddress.seller_warehouse_id,
    warehouse.id,
  );

  // Ensure recreated address is different from the initial one by id
  TestValidator.notEquals(
    "recreated address id should differ from initial address id",
    recreatedAddress.id,
    initialAddress.id,
  );

  // 10. Switch to admin via login to perform admin-side delete
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginAuth);

  TestValidator.equals(
    "admin login email should match",
    adminLoginAuth.email,
    adminLoginBody.email,
  );

  // 11. Admin deletes the seller warehouse address for the same warehouseId
  await api.functional.shoppingMall.admin.sellerWarehouses.address.erase(
    connection,
    {
      warehouseId: warehouse.id,
    },
  );

  // If we reach here without errors, admin delete has successfully
  // operated on the current address state. As a final sanity check,
  // confirm that the warehouse id is still usable as an identifier in
  // further calls that only rely on the id being valid. With current
  // limited APIs, we simply assert that invoking another seller delete
  // for the same warehouse does not resurrect the address and does not
  // break the system (idempotent/no-op behavior is acceptable).

  await api.functional.shoppingMall.seller.sellerWarehouses.address.erase(
    connection,
    {
      warehouseId: warehouse.id,
    },
  );

  // The absence of thrown errors across all operations is treated as
  // evidence that:
  // - Seller can delete and recreate addresses for the same warehouse.
  // - Admin can delete the latest address after such lifecycle changes.
  // - The warehouse header itself remains stable and usable throughout.
}
